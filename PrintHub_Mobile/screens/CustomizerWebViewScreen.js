// PrintHub_Mobile/screens/CustomizerWebViewScreen.js

import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Alert,
  Modal,
} from "react-native";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { WEB_APP_URL, API_BASE_URL } from "../config";

/*
|--------------------------------------------------------------------------
| DESIGN TOOL MENU
|--------------------------------------------------------------------------
| Templates intentionally removed.
|--------------------------------------------------------------------------
*/

const CUSTOMIZE_CATEGORIES = [
  {
    key: "COLORS",
    label: "Colors",
    description: "Change shirt color",
    icon: "color-palette-outline",
    target: "COLORS",
  },
  {
    key: "TEXT",
    label: "Text",
    description: "Add and edit text",
    icon: "text-outline",
    target: "TEXT",
  },
  {
    key: "GRAPHICS",
    label: "Graphics & Shapes",
    description: "Add icons, shapes, etc.",
    icon: "shapes-outline",
    target: "GRAPHICS",
  },
  {
    key: "MORE",
    label: "Uploads",
    description: "Upload your own design",
    icon: "cloud-upload-outline",
    target: "GALLERY",
  },
  {
    key: "AI",
    label: "AI Design",
    description: "Generate with AI",
    icon: "sparkles-outline",
    target: "AI",
  },
  {
    key: "LAYERS",
    label: "Layers",
    description: "Manage design layers",
    icon: "layers-outline",
    target: "LAYERS_PANEL",
  },
  {
    key: "MEASUREMENTS",
    label: "Measurements",
    description: "Print area & size guide",
    icon: "resize-outline",
    target: "SPECS",
  },
  {
    key: "HELP",
    label: "Help",
    description: "Tips and guides",
    icon: "help-circle-outline",
    target: null,
  },
];

const SIDES = ["Front", "Back", "Left", "Right"];

export default function CustomizerWebViewScreen({
  route,
  navigation,
}) {
  const { product, selectedOptions } = route.params || {};
  const productId = product?.id;

  const [userJson, setUserJson] = useState(null);
  const [designDirty, setDesignDirty] = useState(false);

  // Native Design Tools drawer
  const [sheetOpen, setSheetOpen] = useState(false);

  // Current native 2D / 3D mode
  const [viewMode, setViewMode] = useState("2D");

  const [activeSide, setActiveSide] = useState("Front");

  const webViewRef = useRef(null);

  /*
  |--------------------------------------------------------------------------
  | LOAD LOCAL USER
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    getLocalUser();
  }, []);

  const getLocalUser = async () => {
    try {
      const savedUser = await AsyncStorage.getItem("user");

      if (savedUser) {
        setUserJson(savedUser);
      }
    } catch (err) {
      console.error(
        "[getLocalUser] {ReadStorage}: " + err.message
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | BUILD WEB CUSTOMIZER URL
  |--------------------------------------------------------------------------
  */

  const queryParts = [
    "customizer=true",
    "embed=true",
    `apiUrl=${encodeURIComponent(API_BASE_URL)}`,
  ];

  if (selectedOptions) {
    if (selectedOptions.size) {
      queryParts.push(
        `size=${encodeURIComponent(selectedOptions.size)}`
      );
    }

    if (selectedOptions.material) {
      queryParts.push(
        `material=${encodeURIComponent(
          selectedOptions.material
        )}`
      );
    }

    if (selectedOptions.side) {
      queryParts.push(
        `side=${encodeURIComponent(selectedOptions.side)}`
      );
    }

    if (selectedOptions.finishing) {
      queryParts.push(
        `finishing=${encodeURIComponent(
          selectedOptions.finishing
        )}`
      );
    }

    if (selectedOptions.color) {
      queryParts.push(
        `color=${encodeURIComponent(selectedOptions.color)}`
      );
    }
  }

  const targetUrl =
    `${WEB_APP_URL}/product/${productId}?` +
    queryParts.join("&");

  /*
  |--------------------------------------------------------------------------
  | WEBVIEW SCRIPT HELPER
  |--------------------------------------------------------------------------
  */

  const runWebViewScript = (script) => {
    if (!webViewRef.current) return;

    webViewRef.current.injectJavaScript(`
      (function() {
        try {
          ${script}
        } catch (e) {
          console.log("[PMG RN Bridge]", e);
        }
      })();

      true;
    `);
  };

  /*
  |--------------------------------------------------------------------------
  | CLEAR ALL
  |--------------------------------------------------------------------------
  */

  const handleClearAll = () => {
    runWebViewScript(`
      var button = window.__PMG_FIND_BUTTON__
        ? window.__PMG_FIND_BUTTON__("Clear All")
        : null;

      if (button) {
        button.click();
      }
    `);
  };

  /*
  |--------------------------------------------------------------------------
  | USE THIS DESIGN
  |--------------------------------------------------------------------------
  */

  const handleUseThisDesign = () => {
    if (!designDirty) return;

    runWebViewScript(`
      var button = window.__PMG_FIND_BUTTON__
        ? window.__PMG_FIND_BUTTON__("Use This Design")
        : null;

      if (button) {
        button.disabled = false;
        button.removeAttribute("disabled");
        button.setAttribute("aria-disabled", "false");
        button.click();
      }
    `);
  };

  /*
  |--------------------------------------------------------------------------
  | CHANGE FRONT / BACK / LEFT / RIGHT
  |--------------------------------------------------------------------------
  */

  const handleSideChange = (side) => {
    setActiveSide(side);

    runWebViewScript(`
      if (window.__PMG_SET_VIEW__) {
        window.__PMG_SET_VIEW__(
          ${JSON.stringify(side.toLowerCase())}
        );
      }
    `);
  };

  /*
  |--------------------------------------------------------------------------
  | CHANGE 2D / 3D VIEW
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  | We are NOT touching TshirtPreview3D.js.
  |
  | The existing web customizer already has its own mobile 2D/3D
  | state. We simply trigger its existing button.
  |--------------------------------------------------------------------------
  */

  

  const handleViewModeChange = (mode) => {
    setViewMode(mode);

    runWebViewScript(`
      if (window.__PMG_SET_MOBILE_VIEW__) {
        window.__PMG_SET_MOBILE_VIEW__(
          ${JSON.stringify(mode.toLowerCase())}
        );
      }
    `);
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN DESIGN TOOL
  |--------------------------------------------------------------------------
  */

  const openCategory = (cat) => {
    setSheetOpen(false);

    if (!cat.target) {
      Alert.alert(
        "Help",
        "Use the design canvas to select, move, resize, and customize your design."
      );
      return;
    }

    if (cat.target === "LAYERS_PANEL") {
      runWebViewScript(`
        if (window.__PMG_OPEN_LAYERS__) {
          window.__PMG_OPEN_LAYERS__();
        }
      `);

      return;
    }

    runWebViewScript(`
      if (window.__PMG_OPEN_CATEGORY__) {
        window.__PMG_OPEN_CATEGORY__(
          ${JSON.stringify(cat.target)}
        );
      }
    `);
  };

  const [activeTool, setActiveTool] =
  useState(null);

  /*
  |--------------------------------------------------------------------------
  | PRELOAD JAVASCRIPT
  |--------------------------------------------------------------------------
  */

  const injectedPreLoadJS = `
    (function() {
      try {
        sessionStorage.setItem(
          "pmg_splash_seen",
          "true"
        );

        ${
          userJson
            ? `localStorage.setItem(
                "user",
                JSON.stringify(${userJson})
              );`
            : `localStorage.setItem(
                "user",
                JSON.stringify({
                  role: "guest"
                })
              );`
        }
      } catch (e) {
        console.log(
          "[PMG] preload error",
          e
        );
      }
    })();

    true;
  `;

  /*
  |--------------------------------------------------------------------------
  | WEBVIEW JAVASCRIPT
  |--------------------------------------------------------------------------
  */

  const injectedPostLoadJS = `
    (function() {

      /*
      |--------------------------------------------------------------------------
      | ERROR CAPTURE
      |--------------------------------------------------------------------------
      */

      window.addEventListener(
        "error",
        function(e) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: "PMG_DEBUG_ERROR",
                message: e.message,
                source: e.filename,
                line: e.lineno,
              })
            );
          }
        }
      );

      window.addEventListener(
        "unhandledrejection",
        function(e) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: "PMG_DEBUG_ERROR",
                message:
                  "Unhandled rejection: " +
                  (
                    e.reason?.message ||
                    e.reason
                  ),
              })
            );
          }
        }
      );

      /*
      |--------------------------------------------------------------------------
      | FETCH ERROR CAPTURE
      |--------------------------------------------------------------------------
      */

      var _origFetch = window.fetch;

      window.fetch = function() {
        return _origFetch
          .apply(this, arguments)
          .catch(function(err) {

            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({
                  type: "PMG_DEBUG_ERROR",
                  message:
                    "Fetch failed: " +
                    arguments[0] +
                    " — " +
                    err.message,
                })
              );
            }

            throw err;
          });
      };

      /*
      |--------------------------------------------------------------------------
      | STYLE ID
      |--------------------------------------------------------------------------
      */

      var STYLE_ID =
        "pmg-mobile-customizer-style";

      /*
      |--------------------------------------------------------------------------
      | FIND ORIGINAL BUTTON
      |--------------------------------------------------------------------------
      */

      function findRealButton(label) {
        var wanted = String(label)
          .toLowerCase()
          .trim();

        var buttons = Array.from(
          document.querySelectorAll(
            ".tsc-root button, button"
          )
        );

        return buttons.find(
          function(button) {

            var text =
              (
                button.innerText ||
                button.textContent ||
                ""
              )
                .replace(/\\s+/g, " ")
                .trim()
                .toLowerCase();

            return (
              text === wanted ||
              text.indexOf(
                wanted + " "
              ) === 0 ||
              text.indexOf(
                " " + wanted + " "
              ) !== -1 ||
              text.indexOf(
                wanted
              ) !== -1
            );
          }
        );
      }

      window.__PMG_FIND_BUTTON__ =
        findRealButton;

      /*
      |--------------------------------------------------------------------------
      | OPEN WEB CUSTOMIZER CATEGORY
      |--------------------------------------------------------------------------
      */

      window.__PMG_OPEN_CATEGORY__ =
        function(label) {

          var button =
            findRealButton(label);

          if (button) {
            button.click();

            document.body.classList.add(
              "pmg-tool-open"
            );
          }
        };

      /*
      |--------------------------------------------------------------------------
      | CLOSE CATEGORY
      |--------------------------------------------------------------------------
      */

      window.__PMG_CLOSE_CATEGORY__ =
        function() {
          closePanel();
        };

      /*
      |--------------------------------------------------------------------------
      | OPEN LAYERS
      |--------------------------------------------------------------------------
      */

      window.__PMG_OPEN_LAYERS__ =
        function() {

          document.body.classList.add(
            "pmg-tool-open"
          );

          var scrollToBottom =
            function() {

              var container =
                document.querySelector(
                  ".tsc-left-docked, .tsc-sidebar"
                );

              if (container) {
                container.scrollTo({
                  top:
                    container.scrollHeight,
                  behavior:
                    "smooth",
                });
              }
            };

          setTimeout(
            scrollToBottom,
            300
          );

          setTimeout(
            scrollToBottom,
            700
          );
        };

      /*
      |--------------------------------------------------------------------------
      | MOBILE 2D / 3D VIEW BRIDGE
      |--------------------------------------------------------------------------
      |
      | The actual mobileViewMode state belongs to
      | TshirtCustomizerPanel.js.
      |
      | We only trigger the EXISTING control.
      |
      |--------------------------------------------------------------------------
      */

      window.__PMG_SET_MOBILE_VIEW__ =
        function(mode) {

          var wantedMode =
            String(mode)
              .toLowerCase();

          var currentModeButton =
            wantedMode === "3d"
              ? findRealButton("3D View")
              : findRealButton("Edit");

          if (currentModeButton) {
            currentModeButton.click();
            return;
          }

          /*
          | Fallback:
          | The existing customizer's button can have slightly
          | different text depending on its rendered state.
          */

          var buttons =
            Array.from(
              document.querySelectorAll(
                ".tsc-root button, button"
              )
            );

          if (wantedMode === "3d") {

            var threeButton =
              buttons.find(
                function(button) {

                  var text =
                    (
                      button.innerText ||
                      button.textContent ||
                      ""
                    )
                      .replace(
                        /\\s+/g,
                        " "
                      )
                      .trim()
                      .toLowerCase();

                  return (
                    text.indexOf(
                      "3d view"
                    ) !== -1
                  );
                }
              );

            if (threeButton) {
              threeButton.click();
            }

          } else {

            var editButton =
              buttons.find(
                function(button) {

                  var text =
                    (
                      button.innerText ||
                      button.textContent ||
                      ""
                    )
                      .replace(
                        /\\s+/g,
                        " "
                      )
                      .trim()
                      .toLowerCase();

                  return (
                    text === "edit" ||
                    text.indexOf(
                      "edit"
                    ) === 0
                  );
                }
              );

            if (editButton) {
              editButton.click();
            }
          }
        };

      /*
      |--------------------------------------------------------------------------
      | DESIGN STATE
      |--------------------------------------------------------------------------
      */

      var DESIGN_DIRTY = false;
      var DESIGN_STATE_INITIALIZED =
        false;

      var DESIGN_CHANGE_LISTENER_READY =
        false;

      var LAST_SENT_DIRTY = null;

      function reportDesignState() {

        if (
          LAST_SENT_DIRTY ===
          DESIGN_DIRTY
        ) {
          return;
        }

        LAST_SENT_DIRTY =
          DESIGN_DIRTY;

        if (
          window.ReactNativeWebView
        ) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type:
                "DESIGN_STATE",
              dirty:
                DESIGN_DIRTY,
            })
          );
        }
      }

      function setDesignDirty(
        isDirty
      ) {
        DESIGN_DIRTY =
          !!isDirty;

        reportDesignState();
      }

      function detectInitialDesignState() {

        if (
          DESIGN_STATE_INITIALIZED
        ) {
          return;
        }

        var clearButton =
          findRealButton(
            "Clear All"
          );

        if (!clearButton) {
          return;
        }

        DESIGN_DIRTY =
          false;

        DESIGN_STATE_INITIALIZED =
          true;

        reportDesignState();
      }

      /*
      |--------------------------------------------------------------------------
      | FIND ORIGINAL TOOLBAR
      |--------------------------------------------------------------------------
      */

      function findOriginalToolbar() {

        var labels = [
          "SPECS",
          "COLORS",
          "GALLERY",
          "AI",
          "TEXT",
        ];

        var buttons =
          labels
            .map(function(label) {
              return {
                label:
                  label,
                button:
                  findRealButton(
                    label
                  ),
              };
            })
            .filter(
              function(item) {
                return !!item.button;
              }
            );

        if (
          buttons.length === 0
        ) {
          return null;
        }

        var parent =
          buttons[0]
            .button
            .parentElement;

        var depth = 0;

        while (
          parent &&
          parent !==
            document.body &&
          depth < 8
        ) {

          var containsAll =
            buttons.every(
              function(item) {
                return parent.contains(
                  item.button
                );
              }
            );

          if (containsAll) {

            var rect =
              parent.getBoundingClientRect();

            if (
              rect.height < 150 ||
              rect.width >
                window.innerWidth *
                  0.6
            ) {
              return parent;
            }
          }

          parent =
            parent.parentElement;

          depth++;
        }

        return null;
      }

      function hideOriginalToolbar() {

        var toolbar =
          findOriginalToolbar();

        if (!toolbar) {
          return;
        }

        toolbar.setAttribute(
          "data-pmg-original-toolbar",
          "hidden"
        );

        toolbar.style.setProperty(
          "display",
          "none",
          "important"
        );
      }

      /*
      |--------------------------------------------------------------------------
      | HIDE WEB PAGE EXTRA WHITE HEADER
      |--------------------------------------------------------------------------
      */

      function hideExtraWhiteNavigation() {

        var elements =
          Array.from(
            document.querySelectorAll(
              "body *"
            )
          );

        var title =
          elements.find(
            function(element) {

              var text =
                (
                  element.innerText ||
                  element.textContent ||
                  ""
                )
                  .replace(
                    /\\s+/g,
                    " "
                  )
                  .trim();

              return (
                text ===
                "Design Customizer"
              );
            }
          );

        if (!title) {
          return;
        }

        var element = title;

        for (
          var depth = 0;
          depth < 7;
          depth++
        ) {

          if (
            !element ||
            element ===
              document.body
          ) {
            return;
          }

          var rect =
            element.getBoundingClientRect();

          var computed =
            window.getComputedStyle(
              element
            );

          var background =
            computed.backgroundColor ||
            "";

          var isWhiteBackground =
            background ===
              "rgb(255, 255, 255)" ||
            background ===
              "rgba(255, 255, 255, 1)" ||
            background ===
              "rgb(250, 250, 250)" ||
            background ===
              "rgba(250, 250, 250, 1)" ||
            background ===
              "rgb(249, 250, 251)" ||
            background ===
              "rgba(249, 250, 251, 1)";

          if (
            rect.width >=
              window.innerWidth *
                0.8 &&
            rect.height >= 50 &&
            rect.height <= 220 &&
            isWhiteBackground
          ) {

            element.setAttribute(
              "data-pmg-extra-white-navigation",
              "hidden"
            );

            element.style.setProperty(
              "display",
              "none",
              "important"
            );

            return;
          }

          element =
            element.parentElement;
        }
      }

      /*
      |--------------------------------------------------------------------------
      | HIDE ORIGINAL WEB DESIGN ACTIONS
      |--------------------------------------------------------------------------
      */

      function hideOriginalDesignActions() {

        var clearButton =
          findRealButton(
            "Clear All"
          );

        var useButton =
          findRealButton(
            "Use This Design"
          );

        if (
          !clearButton &&
          !useButton
        ) {
          return;
        }

        var buttons = [
          clearButton,
          useButton,
        ].filter(Boolean);

        var parent =
          buttons[0].parentElement;

        var depth = 0;

        while (
          parent &&
          parent !==
            document.body &&
          depth < 8
        ) {

          var containsAll =
            buttons.every(
              function(button) {
                return parent.contains(
                  button
                );
              }
            );

          if (containsAll) {

            var text =
              (
                parent.innerText ||
                parent.textContent ||
                ""
              )
                .replace(
                  /\\s+/g,
                  " "
                )
                .trim()
                .toLowerCase();

            if (
              text.indexOf(
                "clear all"
              ) !== -1 &&
              text.indexOf(
                "use this design"
              ) !== -1
            ) {

              parent.setAttribute(
                "data-pmg-original-design-actions",
                "hidden"
              );

              parent.style.setProperty(
                "display",
                "none",
                "important"
              );

              return;
            }
          }

          parent =
            parent.parentElement;

          depth++;
        }
      }

      /*
      |--------------------------------------------------------------------------
      | DESIGN CHANGE DETECTION
      |--------------------------------------------------------------------------
      */

      function setupDesignChangeDetection() {

        if (
          DESIGN_CHANGE_LISTENER_READY
        ) {
          return;
        }

        DESIGN_CHANGE_LISTENER_READY =
          true;

        /*
        | Text inputs, selects, colors, etc.
        */

        document.addEventListener(
          "input",
          function(event) {

            if (
              event.target &&
              event.target.matches(
                "input, textarea, select"
              )
            ) {
              setDesignDirty(
                true
              );
            }
          },
          true
        );

        document.addEventListener(
          "change",
          function(event) {

            if (
              event.target &&
              event.target.matches(
                "input, textarea, select"
              )
            ) {
              setDesignDirty(
                true
              );
            }
          },
          true
        );

        /*
        | Buttons and editor interactions.
        */

        document.addEventListener(
          "click",
          function(event) {

            var target =
              event.target;

            if (!target) {
              return;
            }

            var clearButton =
              findRealButton(
                "Clear All"
              );

            var useButton =
              findRealButton(
                "Use This Design"
              );

            /*
            | Clear All resets the dirty state.
            */

            if (
              clearButton &&
              (
                target ===
                  clearButton ||
                clearButton.contains(
                  target
                )
              )
            ) {

              setTimeout(
                function() {
                  setDesignDirty(
                    false
                  );
                },
                150
              );

              return;
            }

            /*
            | Use This Design itself does not make
            | the design dirty.
            */

            if (
              useButton &&
              (
                target ===
                  useButton ||
                useButton.contains(
                  target
                )
              )
            ) {
              return;
            }

            /*
            | Any interaction with the sidebar
            | means the design may have changed.
            */

            var sidebar =
              target.closest &&
              target.closest(
                ".tsc-left-docked, .tsc-sidebar"
              );

            if (sidebar) {
              setDesignDirty(
                true
              );
            }

            /*
            | Other interactive controls.
            */

            var interactive =
              target.closest &&
              target.closest(
                "button, [role='button'], [contenteditable='true'], input, textarea, select"
              );

            if (interactive) {

              var interactiveText =
                (
                  interactive.innerText ||
                  interactive.textContent ||
                  interactive.getAttribute(
                    "aria-label"
                  ) ||
                  ""
                )
                  .replace(
                    /\\s+/g,
                    " "
                  )
                  .trim()
                  .toLowerCase();

              var isClearAction =
                interactiveText.indexOf(
                  "clear all"
                ) !== -1;

              var isCloseAction =
                interactiveText.indexOf(
                  "close"
                ) !== -1;

              var isCancelAction =
                interactiveText.indexOf(
                  "cancel"
                ) !== -1;

              if (
                !isClearAction &&
                !isCloseAction &&
                !isCancelAction
              ) {
                setDesignDirty(
                  true
                );
              }
            }

            /*
            | Canvas interaction.
            */

            var previewArea =
              target.closest &&
              target.closest(
                ".tsc-center-placeholders, .tsc-right-preview, .tsc-preview-panel, .tsc-preview-3d, canvas"
              );

            if (previewArea) {
              setDesignDirty(
                true
              );
            }
          },
          true
        );

        /*
        | Drag / resize / rotate on Fabric canvas.
        */

        [
          "pointerdown",
          "touchstart",
          "mousedown",
        ].forEach(
          function(eventName) {

            document.addEventListener(
              eventName,
              function(event) {

                var target =
                  event.target;

                if (!target) {
                  return;
                }

                var editorArea =
                  target.closest &&
                  target.closest(
                    ".tsc-center-placeholders, .tsc-right-preview, .tsc-preview-panel, .tsc-preview-3d, canvas"
                  );

                if (
                  editorArea
                ) {
                  setDesignDirty(
                    true
                  );
                }
              },
              true
            );
          }
        );
      }

      /*
      |--------------------------------------------------------------------------
      | MOBILE STYLES
      |--------------------------------------------------------------------------
      */

      function applyStyles() {

        if (
          !document.head ||
          !document.body
        ) {
          return;
        }

        var style =
          document.getElementById(
            STYLE_ID
          );

        if (!style) {

          style =
            document.createElement(
              "style"
            );

          style.id =
            STYLE_ID;

          document.head.appendChild(
            style
          );
        }

        style.innerHTML = \`

          /*
          |--------------------------------------------------------------------------
          | FULL PAGE
          |--------------------------------------------------------------------------
          */

          html,
          body,
          #root,
          .pd-page,
          .po-page,
          .pd-customizer-page-wrapper,
          .pd-customizer-page-body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100vw !important;
            height: 100% !important;
            min-height: 100% !important;
            background: #ffffff !important;
            overflow: hidden !important;
          }

          /*
          |--------------------------------------------------------------------------
          | CUSTOMIZER ROOT
          |--------------------------------------------------------------------------
          */

          .tsc-root {
            position: relative !important;
            width: 100% !important;
            max-width: 100vw !important;
            height: 100% !important;
            min-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
          }

          /*
          |--------------------------------------------------------------------------
          | MAIN LAYOUT
          |--------------------------------------------------------------------------
          */

          .tsc-3col-layout,
          .tsc-4col-layout {
            position: relative !important;
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            max-width: 100vw !important;
            height: 100% !important;
            min-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
          }

          /*
          |--------------------------------------------------------------------------
          | EXISTING WHITE 2D EDITOR
          |--------------------------------------------------------------------------
          |
          | IMPORTANT:
          | Do not recreate the Fabric editor.
          |
          | This keeps the existing FabricZoneCanvas exactly as the
          | editor surface and only gives it the available mobile area.
          |--------------------------------------------------------------------------
          */

          .tsc-center-placeholders {
            position: relative !important;
            width: 100% !important;
            height: 100% !important;
            min-height: 0 !important;
            flex: 1 1 auto !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #ffffff !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            padding: 0 !important;
          }

          .tsc-center-placeholders
          .tsc-zone-stage {
            width: 100% !important;
            height: 100% !important;
            min-height: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #ffffff !important;
            overflow: hidden !important;
          }

          .tsc-center-placeholders
          .tsc-zone-wrapper {
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            background: #ffffff !important;
            overflow: hidden !important;
          }

          /*
          | Keep the actual Fabric canvas untouched.
          */

          .tsc-center-placeholders canvas {
            max-width: 100% !important;
            max-height: 100% !important;
          }

          /*
          |--------------------------------------------------------------------------
          | HIDE DESKTOP TOOLBAR
          |--------------------------------------------------------------------------
          */

          [data-pmg-original-toolbar="hidden"] {
            display: none !important;
          }

          /*
          |--------------------------------------------------------------------------
          | HIDE ORIGINAL BOTTOM ACTIONS
          |--------------------------------------------------------------------------
          */

          [data-pmg-original-design-actions="hidden"] {
            display: none !important;
          }

          /*
          |--------------------------------------------------------------------------
          | HIDE EXTRA WEB NAVIGATION
          |--------------------------------------------------------------------------
          */

          [data-pmg-extra-white-navigation="hidden"] {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  overflow: hidden !important;
}

          /*
          |--------------------------------------------------------------------------
          | ORIGINAL WEB SIDEBAR
          |--------------------------------------------------------------------------
          |
          | This remains the real design-tool panel.
          | Native mobile menu simply opens it.
          |--------------------------------------------------------------------------
          */

          .tsc-left-docked,
          .tsc-sidebar {
            position: fixed !important;
            top: auto !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: 78% !important;

            background: #ffffff !important;

            border-radius:
              24px 24px 0 0 !important;

            padding:
              16px 16px 24px !important;

            overflow-y: auto !important;
            overflow-x: hidden !important;

            -webkit-overflow-scrolling:
              touch !important;

            z-index: 99998 !important;

            pointer-events: none !important;

            opacity: 0 !important;
            visibility: hidden !important;

            transform:
              translateY(30px) !important;

            transition:
              transform .25s ease,
              opacity .25s ease,
              visibility .25s !important;

            box-shadow:
              0 -10px 35px
              rgba(0,0,0,.20) !important;

            border:
              1px solid #edf1ef !important;

            border-bottom: none !important;

            box-sizing:
              border-box !important;
          }

          body.pmg-tool-open
          .tsc-left-docked,

          body.pmg-tool-open
          .tsc-sidebar {
            pointer-events: auto !important;
            opacity: 1 !important;
            visibility: visible !important;
            transform: translateY(0) !important;
          }

          /*
          |--------------------------------------------------------------------------
          | SIDEBAR HANDLE
          |--------------------------------------------------------------------------
          */

          .tsc-left-docked::before,
          .tsc-sidebar::before {
            content: "" !important;

            display: block !important;

            width: 38px !important;
            height: 4px !important;

            border-radius: 5px !important;

            background: #d7e2dd !important;

            margin:
              0 auto 14px !important;
          }

          /*
          |--------------------------------------------------------------------------
          | SIDEBAR CONTENT
          |--------------------------------------------------------------------------
          */

          .tsc-sidebar-section {
            border-radius: 16px !important;
          }

          .tsc-left-docked *,
          .tsc-sidebar * {
            pointer-events: auto !important;
          }

          /*
          |--------------------------------------------------------------------------
          | BUTTONS / INPUTS
          |--------------------------------------------------------------------------
          */

          .tsc-root button,
          .tsc-root input,
          .tsc-root select,
          .tsc-root textarea,
          .tsc-root label,
          .tsc-root [role="button"] {
            pointer-events: auto !important;
          }

          /*
          |--------------------------------------------------------------------------
          | CHATBOT
          |--------------------------------------------------------------------------
          */

          .phc-fab,
          .phc-window,
          .chatbot-container,
          .chatbot-toggle-btn,
          .ph-chatbot-fab,
          .chatbot-wrapper,
          #printhub-chatbot-root,
          .printhub-chatbot-btn {
            display: none !important;
          }

          /*
          |--------------------------------------------------------------------------
          | REMOVE SCROLLBARS
          |--------------------------------------------------------------------------
          */

          *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }

          * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }

          /*
          |--------------------------------------------------------------------------
          | EXISTING 3D PREVIEW
          |--------------------------------------------------------------------------
          |
          | No 3D implementation is changed.
          | These are only layout rules.
          |--------------------------------------------------------------------------
          */

          .tsc-right-preview {
            position: relative !important;
            width: 100% !important;
            height: 100% !important;
            min-height: 0 !important;
            flex: 1 1 auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #1d2333 !important;
            border: none !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
            overflow: hidden !important;
            z-index: 1 !important;
            pointer-events: auto !important;
          }

          .tsc-right-preview
          .tsc-preview-panel {
            height: 100% !important;
            min-height: 0 !important;
            flex: 1 1 auto !important;
          }

          .tsc-right-preview
          .tsc-preview-3d {
            height: 100% !important;
            min-height: 0 !important;
            max-height: none !important;
            flex: 1 1 auto !important;
          }

          .tsc-preview-panel {
            width: 100% !important;
            height: 100% !important;
            min-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #1d2333 !important;
            border: none !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: hidden !important;
            pointer-events: auto !important;
          }

          .tsc-preview-3d {
            width: 100% !important;
            height: 100% !important;
            min-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #1d2333 !important;
            border: none !important;
            box-shadow: none !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: hidden !important;
            pointer-events: auto !important;
          }
        \`;
      }

      /*
      |--------------------------------------------------------------------------
      | CLOSE WEB TOOL PANEL
      |--------------------------------------------------------------------------
      */

function closePanel() {
  document.body.classList.remove(
    "pmg-tool-open"
  );

  var closeLabels = [
    "Close",
    "Cancel",
    "Done",
    "Back"
  ];

  var buttons = Array.from(
    document.querySelectorAll(
      ".tsc-root button, button, [role='button']"
    )
  );

  for (
    var i = 0;
    i < closeLabels.length;
    i++
  ) {
    var wanted =
      closeLabels[i].toLowerCase();

    var closeButton =
      buttons.find(
        function(button) {
          var text =
            (
              button.innerText ||
              button.textContent ||
              button.getAttribute("aria-label") ||
              ""
            )
              .replace(/\s+/g, " ")
              .trim()
              .toLowerCase();

          return (
            text === wanted ||
            text.indexOf(
              wanted
            ) === 0
          );
        }
      );

    if (closeButton) {
      closeButton.click();

      setTimeout(
        function() {
          document.body.classList.remove(
            "pmg-tool-open"
          );
        },
        100
      );

      return;
    }
  }

  document.body.classList.remove(
    "pmg-tool-open"
  );
}

      /*
      |--------------------------------------------------------------------------
      | CLOSE TOOL PANEL WHEN CLICKING 3D BACKGROUND
      |--------------------------------------------------------------------------
      */

      function addCloseOnBackgroundClick() {

        var preview =
          document.querySelector(
            ".tsc-right-preview"
          );

        if (!preview) {
          return;
        }

        preview.addEventListener(
          "click",
          function(e) {

            if (
              !document.body.classList.contains(
                "pmg-tool-open"
              )
            ) {
              return;
            }

            if (
              e.target === preview ||
              e.target.classList.contains(
                "tsc-preview-panel"
              )
            ) {
              closePanel();
            }
          }
        );
      }

      /*
      |--------------------------------------------------------------------------
      | INITIALIZE
      |--------------------------------------------------------------------------
      */

      function initialize() {

        hideOriginalToolbar();

        hideExtraWhiteNavigation();

        hideOriginalDesignActions();

        applyStyles();

        addCloseOnBackgroundClick();

        setupDesignChangeDetection();

        detectInitialDesignState();
      }

      initialize();

      /*
      |--------------------------------------------------------------------------
      | RE-INITIALIZE AFTER WEB CUSTOMIZER LOAD
      |--------------------------------------------------------------------------
      */

      [
        300,
        700,
        1200,
        2000,
        3000,
      ].forEach(
        function(delay) {

          setTimeout(
            initialize,
            delay
          );
        }
      );

      /*
      |--------------------------------------------------------------------------
      | MUTATION OBSERVER
      |--------------------------------------------------------------------------
      */

      var observer =
        new MutationObserver(
          function() {

            hideOriginalToolbar();

            hideExtraWhiteNavigation();

            hideOriginalDesignActions();

            applyStyles();

            detectInitialDesignState();
          }
        );

      if (document.body) {

        observer.observe(
          document.body,
          {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [
              "style",
              "class",
            ],
          }
        );
      }

    })();

    true;
  `;

  /*
  |--------------------------------------------------------------------------
  | WEBVIEW MESSAGE HANDLER
  |--------------------------------------------------------------------------
  */

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(
        event.nativeEvent.data
      );

      /*
      | Design changed / cleared.
      */

      if (
        data.type ===
        "DESIGN_STATE"
      ) {
        setDesignDirty(
          !!data.dirty
        );

        return;
      }

      /*
      | Debug errors.
      */

      if (
        data.type ===
        "PMG_DEBUG_ERROR"
      ) {
        console.log(
          "[PMG_DEBUG_ERROR]",
          data.message,
          data.source,
          data.line
        );

        return;
      }

      /*
      | Existing Use This Design success.
      */

      if (
        data.type ===
        "DESIGN_COMPLETED"
      ) {

        Alert.alert(
          "Success",
          "Added to cart with custom options!",
          [
            {
              text: "OK",
              onPress: () =>
                navigation.navigate(
                  "Main",
                  {
                    screen:
                      "CartTab",
                  }
                ),
            },
          ]
        );
      }

    } catch (err) {

      console.error(
        "[handleWebViewMessage] {ParseEvent}: " +
          err.message
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <SafeAreaView
      style={styles.safeArea}
    >

      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
      />

      {/* =====================================================
          HEADER
          ===================================================== */}

      <View style={styles.header}>

        {/* BACK */}

        <TouchableOpacity
          onPress={() =>
            navigation.goBack()
          }
          style={
            styles.headerIconButton
          }
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={29}
            color="#173d34"
          />
        </TouchableOpacity>

        {/* TITLE */}

        <View
          style={
            styles.headerTitleContainer
          }
        >
          <Text
            style={
              styles.headerTitle
            }
          >
            T-Shirt Customizer
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Design Your Own T-shirt
          </Text>
        </View>

        {/* MENU */}

        <TouchableOpacity
          onPress={() =>
            setSheetOpen(true)
          }
          style={
            styles.menuButton
          }
          activeOpacity={0.8}
        >
          <Ionicons
            name="menu"
            size={29}
            color="#173d34"
          />
        </TouchableOpacity>

      </View>

      {/* =====================================================
          2D / 3D SWITCHER
          ===================================================== */}

      <View
        style={
          styles.viewSwitcher
        }
      >

        <TouchableOpacity
          style={[
            styles.viewOption,
            viewMode === "2D" &&
              styles.viewOptionActive,
          ]}
          onPress={() =>
            handleViewModeChange(
              "2D"
            )
          }
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.viewOptionText,
              viewMode === "2D" &&
                styles.viewOptionTextActive,
            ]}
          >
            2D Editor
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewOption,
            viewMode === "3D" &&
              styles.viewOptionActive,
          ]}
          onPress={() =>
            handleViewModeChange(
              "3D"
            )
          }
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.viewOptionText,
              viewMode === "3D" &&
                styles.viewOptionTextActive,
            ]}
          >
            3D Preview
          </Text>
        </TouchableOpacity>

      </View>

      {/* =====================================================
          EXISTING WEB EDITOR
          ===================================================== */}

      <View
        style={
          styles.webviewContainer
        }
      >

        <WebView
          ref={webViewRef}

          source={{
            uri: targetUrl,
          }}

          injectedJavaScriptBeforeContentLoaded={
            injectedPreLoadJS
          }

          injectedJavaScript={
            injectedPostLoadJS
          }

          onMessage={
            handleWebViewMessage
          }

          style={
            styles.webview
          }

          javaScriptEnabled={true}

          domStorageEnabled={true}

          originWhitelist={[
            "*",
          ]}

          mixedContentMode="always"

          allowFileAccess={true}

          allowUniversalAccessFromFileURLs={
            true
          }

          showsVerticalScrollIndicator={
            false
          }

          showsHorizontalScrollIndicator={
            false
          }

          onError={(
            syntheticEvent
          ) => {

            const {
              nativeEvent,
            } =
              syntheticEvent;

            console.warn(
              "[WebViewError]",
              nativeEvent
            );
          }}
        />

      </View>

      {/* =====================================================
          FRONT / BACK / LEFT / RIGHT
          ===================================================== */}

      <View
        style={
          styles.sideTabsRow
        }
      >

        {SIDES.map(
          (side) => (

            <TouchableOpacity
              key={side}
              onPress={() =>
                handleSideChange(
                  side
                )
              }
              style={[
                styles.sideTab,
                activeSide ===
                  side &&
                  styles.sideTabActive,
              ]}
              activeOpacity={0.8}
            >

              <Text
                style={[
                  styles.sideTabText,
                  activeSide ===
                    side &&
                    styles.sideTabTextActive,
                ]}
              >
                {side}
              </Text>

            </TouchableOpacity>

          )
        )}

      </View>

      {/* =====================================================
          USE THIS DESIGN
          ===================================================== */}

      <View
        style={
          styles.bottomBar
        }
      >

        <TouchableOpacity
          style={[
            styles.useDesignButton,
            !designDirty &&
              styles.useDesignButtonDisabled,
          ]}
          onPress={
            handleUseThisDesign
          }
          disabled={
            !designDirty
          }
          activeOpacity={0.85}
        >

          <Ionicons
            name="cart-outline"
            size={27}
            color="#ffffff"
          />

          <Text
            style={
              styles.useDesignButtonText
            }
          >
            Use This Design
          </Text>

        </TouchableOpacity>

      </View>

      {/* =====================================================
          DESIGN TOOLS DRAWER
          ===================================================== */}

      <Modal
        visible={sheetOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() =>
          setSheetOpen(false)
        }
      >

        <View
          style={
            styles.drawerOverlay
          }
        >

          {/* BACKDROP */}

          <TouchableOpacity
            style={
              styles.drawerBackdrop
            }
            activeOpacity={1}
            onPress={() =>
              setSheetOpen(false)
            }
          />

          {/* DRAWER */}

          <View
            style={
              styles.drawer
            }
          >

            {/* HEADER */}

            <View
              style={
                styles.drawerHeader
              }
            >

              <View>
                <Text
                  style={
                    styles.drawerTitle
                  }
                >
                  Design Tools
                </Text>

                <Text
                  style={
                    styles.drawerSubtitle
                  }
                >
                  Create. Customize. Print.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setSheetOpen(false)
                }
                style={
                  styles.drawerClose
                }
                activeOpacity={0.7}
              >
                <Ionicons
                  name="close"
                  size={31}
                  color="#173d34"
                />
              </TouchableOpacity>

            </View>

            {/* TOOL LIST */}

            <View
              style={
                styles.drawerItems
              }
            >

              {CUSTOMIZE_CATEGORIES.map(
                (cat) => (

                  <TouchableOpacity
                    key={cat.key}
                    style={
                      styles.drawerItem
                    }
                    activeOpacity={0.82}
                    onPress={() =>
                      openCategory(
                        cat
                      )
                    }
                  >

                    {/* ICON */}

                    <View
                      style={
                        styles.drawerIconCircle
                      }
                    >

                      <Ionicons
                        name={
                          cat.icon
                        }
                        size={25}
                        color="#173d34"
                      />

                    </View>

                    {/* TEXT */}

                    <View
                      style={
                        styles.drawerItemText
                      }
                    >

                      <Text
                        style={
                          styles.drawerItemTitle
                        }
                      >
                        {cat.label}
                      </Text>

                      <Text
                        style={
                          styles.drawerItemDescription
                        }
                      >
                        {
                          cat.description
                        }
                      </Text>

                    </View>

                    {/* ARROW */}

                    <Ionicons
                      name="chevron-forward"
                      size={21}
                      color="#7b8782"
                    />

                  </TouchableOpacity>

                )
              )}

            </View>

          </View>

        </View>

      </Modal>

    </SafeAreaView>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles =
  StyleSheet.create({

    /*
    |--------------------------------------------------------------------------
    | SCREEN
    |--------------------------------------------------------------------------
    */

    safeArea: {
      flex: 1,
      backgroundColor:
        "#ffffff",
    },

    /*
    |--------------------------------------------------------------------------
    | HEADER
    |--------------------------------------------------------------------------
    */

header: {
  height: 78,

  backgroundColor:
    "#ffffff",

  flexDirection:
    "row",

  alignItems:
    "center",

  justifyContent:
    "space-between",

  paddingHorizontal:
    14,

  borderBottomWidth:
    1,

  borderBottomColor:
    "#edf1ef",
},

    headerIconButton: {
      width: 44,
      height: 44,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    headerTitleContainer: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    headerTitle: {
      color:
        "#173d34",

      fontSize:
        21,

      fontWeight:
        "800",

      letterSpacing:
        -0.3,
    },

    headerSubtitle: {
      marginTop:
        2,

      color:
        "#89958f",

      fontSize:
        12,

      fontWeight:
        "500",
    },

    menuButton: {
      width: 48,
      height: 48,

      borderRadius:
        24,

      backgroundColor:
        "#edf7f2",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    /*
    |--------------------------------------------------------------------------
    | 2D / 3D SWITCHER
    |--------------------------------------------------------------------------
    */

    viewSwitcher: {
      alignSelf:
        "center",

      width:
        "76%",

      height:
        50,

      marginTop:
        12,

      marginBottom:
        8,

      padding:
        4,

      borderRadius:
        26,

      backgroundColor:
        "#eaf1ed",

      flexDirection:
        "row",
    },

    viewOption: {
      flex: 1,

      borderRadius:
        22,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    viewOptionActive: {
      backgroundColor:
        "#164f3f",
    },

    viewOptionText: {
      color:
        "#173d34",

      fontSize:
        14,

      fontWeight:
        "600",
    },

    viewOptionTextActive: {
      color:
        "#ffffff",

      fontWeight:
        "700",
    },

    /*
    |--------------------------------------------------------------------------
    | WEBVIEW
    |--------------------------------------------------------------------------
    */

    webviewContainer: {
      flex: 1,

      backgroundColor:
        "#ffffff",

      marginHorizontal:
        12,

      marginTop:
        3,

      borderRadius:
        20,

      overflow:
        "hidden",
    },

    webview: {
      flex: 1,

      backgroundColor:
        "#ffffff",
    },

    /*
    |--------------------------------------------------------------------------
    | FRONT / BACK / LEFT / RIGHT
    |--------------------------------------------------------------------------
    */

    sideTabsRow: {
      backgroundColor:
        "#ffffff",

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      paddingHorizontal:
        14,

      paddingTop:
        10,

      paddingBottom:
        8,

      gap:
        7,
    },

    sideTab: {
      flex: 1,

      height:
        50,

      borderRadius:
        15,

      backgroundColor:
        "#f4f7f5",

      borderWidth:
        1,

      borderColor:
        "#e3ebe7",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    sideTabActive: {
      backgroundColor:
        "#dff2e9",

      borderColor:
        "#1e604e",
    },

    sideTabText: {
      color:
        "#7c8783",

      fontSize:
        12,

      fontWeight:
        "600",
    },

    sideTabTextActive: {
      color:
        "#173d34",

      fontWeight:
        "700",
    },

    /*
    |--------------------------------------------------------------------------
    | BOTTOM USE DESIGN
    |--------------------------------------------------------------------------
    */

    bottomBar: {
      backgroundColor:
        "#ffffff",

      paddingHorizontal:
        14,

      paddingTop:
        3,

      paddingBottom:
        12,
    },

    useDesignButton: {
      height:
        58,

      borderRadius:
        18,

      backgroundColor:
        "#1f604d",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap:
        10,
    },

    useDesignButtonDisabled: {
      opacity:
        0.55,
    },

    useDesignButtonText: {
      color:
        "#ffffff",

      fontSize:
        16,

      fontWeight:
        "800",
    },

    /*
    |--------------------------------------------------------------------------
    | DESIGN TOOLS DRAWER
    |--------------------------------------------------------------------------
    */

    drawerOverlay: {
      flex: 1,

      flexDirection:
        "row",

      backgroundColor:
        "transparent",
    },

    drawerBackdrop: {
      flex: 1,

      backgroundColor:
        "rgba(0,0,0,0.42)",
    },

    drawer: {
      width:
        "82%",

      height:
        "100%",

      backgroundColor:
        "#ffffff",

      paddingTop:
        52,

      paddingHorizontal:
        18,

      paddingBottom:
        24,

      shadowColor:
        "#000000",

      shadowOffset: {
        width:
          -4,
        height:
          0,
      },

      shadowOpacity:
        0.18,

      shadowRadius:
        18,

      elevation:
        20,
    },

    drawerHeader: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",

      justifyContent:
        "space-between",

      marginBottom:
        22,
    },

    drawerTitle: {
      color:
        "#173d34",

      fontSize:
        26,

      fontWeight:
        "800",
    },

    drawerSubtitle: {
      color:
        "#7d8985",

      fontSize:
        14,

      marginTop:
        5,
    },

    drawerClose: {
      width:
        42,

      height:
        42,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    drawerItems: {
      gap:
        10,
    },

    drawerItem: {
      minHeight:
        76,

      borderRadius:
        18,

      backgroundColor:
        "#fafcfb",

      borderWidth:
        1,

      borderColor:
        "#edf2ef",

      flexDirection:
        "row",

      alignItems:
        "center",

      paddingHorizontal:
        12,
    },

    drawerIconCircle: {
      width:
        48,

      height:
        48,

      borderRadius:
        24,

      backgroundColor:
        "#e9f5ef",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight:
        12,
    },

    drawerItemText: {
      flex: 1,
    },

    drawerItemTitle: {
      color:
        "#17201d",

      fontSize:
        15,

      fontWeight:
        "800",
    },

    drawerItemDescription: {
      color:
        "#7d8985",

      fontSize:
        12,

      marginTop:
        3,
    },
  });