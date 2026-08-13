import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WEB_APP_URL, API_BASE_URL } from "../config";

export default function CustomizerWebViewScreen({ route, navigation }) {
  const { product, selectedOptions } = route.params || {};
  const productId = product?.id;

  const [userJson, setUserJson] = useState(null);
  const [designDirty, setDesignDirty] = useState(false);

  const webViewRef = useRef(null);

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

  // ---------------------------------------------------------
  // BUILD URL
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // DESIGN ACTIONS
  // ---------------------------------------------------------

  const runWebViewScript = (script) => {
    if (!webViewRef.current) return;

    webViewRef.current.injectJavaScript(`
      (function() {
        ${script}
      })();
      true;
    `);
  };

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

  // ---------------------------------------------------------
  // PRELOAD
  // ---------------------------------------------------------

  const injectedPreLoadJS = `
    (function() {
      try {
        sessionStorage.setItem("pmg_splash_seen", "true");

        ${
          userJson
            ? `localStorage.setItem("user", JSON.stringify(${userJson}));`
            : `localStorage.setItem("user", JSON.stringify({ role: "guest" }));`
        }
      } catch (e) {
        console.log("[PMG] preload error", e);
      }
    })();
    true;
  `;

  // ---------------------------------------------------------
  // WEBVIEW JAVASCRIPT
  // ---------------------------------------------------------

  const injectedPostLoadJS = `
    (function() {

      var STYLE_ID = "pmg-mobile-customizer-style";
      var MENU_ID = "pmg-mobile-customizer-menu";

      function findRealButton(label) {
        var wanted = String(label).toLowerCase().trim();

        var buttons = Array.from(
          document.querySelectorAll(".tsc-root button, button")
        );

        return buttons.find(function(button) {
          var text =
            (button.innerText ||
              button.textContent ||
              "")
              .replace(/\\s+/g, " ")
              .trim()
              .toLowerCase();

          return (
            text === wanted ||
            text.indexOf(wanted + " ") === 0 ||
            text.indexOf(" " + wanted + " ") !== -1 ||
            text.indexOf(wanted) !== -1
          );
        });
      }

      window.__PMG_FIND_BUTTON__ = findRealButton;

      var DESIGN_DIRTY = false;
      var DESIGN_STATE_INITIALIZED = false;
      var DESIGN_CHANGE_LISTENER_READY = false;
      var LAST_SENT_DIRTY = null;

      var PMG_PATTERN_ID =
        "pmg-mobile-tshirt-pattern";

      var PMG_PATTERN_ACTIVE = false;

      // -------------------------------------------------------
      // DESIGN STATE
      // -------------------------------------------------------

      function reportDesignState() {
        if (LAST_SENT_DIRTY === DESIGN_DIRTY) {
          return;
        }

        LAST_SENT_DIRTY = DESIGN_DIRTY;

        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: "DESIGN_STATE",
              dirty: DESIGN_DIRTY,
            })
          );
        }
      }

      function detectInitialDesignState() {
        if (DESIGN_STATE_INITIALIZED) {
          return;
        }

        var clearButton =
          findRealButton("Clear All");

        if (!clearButton) {
          return;
        }

        DESIGN_DIRTY = false;
        DESIGN_STATE_INITIALIZED = true;

        reportDesignState();
      }

      function setDesignDirty(isDirty) {
        DESIGN_DIRTY = !!isDirty;
        reportDesignState();
      }

      // -------------------------------------------------------
      // FIND ORIGINAL TOOLBAR
      // -------------------------------------------------------

      function findOriginalToolbar() {
        var labels = [
          "SPECS",
          "COLORS",
          "GALLERY",
          "AI",
          "TEXT",
        ];

        var buttons = labels
          .map(function(label) {
            return {
              label: label,
              button: findRealButton(label),
            };
          })
          .filter(function(item) {
            return item.button;
          });

        if (buttons.length === 0) {
          return null;
        }

        var parent =
          buttons[0].button.parentElement;

        var depth = 0;

        while (
          parent &&
          parent !== document.body &&
          depth < 8
        ) {
          var containsAll =
            buttons.every(function(item) {
              return parent.contains(
                item.button
              );
            });

          if (containsAll) {
            var rect =
              parent.getBoundingClientRect();

            if (
              rect.height < 150 ||
              rect.width >
                window.innerWidth * 0.6
            ) {
              return parent;
            }
          }

          parent = parent.parentElement;
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

      // -------------------------------------------------------
      // REMOVE EXTRA WHITE NAVIGATION
      // -------------------------------------------------------

      function hideExtraWhiteNavigation() {
        var elements = Array.from(
          document.querySelectorAll("body *")
        );

        var title = elements.find(
          function(element) {
            var text =
              (
                element.innerText ||
                element.textContent ||
                ""
              )
                .replace(/\\s+/g, " ")
                .trim();

            return (
              text === "Design Customizer"
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
            element === document.body
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
              window.innerWidth * 0.8 &&
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

      // -------------------------------------------------------
      // HIDE ORIGINAL DESIGN ACTIONS
      // -------------------------------------------------------

      function hideOriginalDesignActions() {
        var clearButton =
          findRealButton("Clear All");

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
          parent !== document.body &&
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
                .replace(/\\s+/g, " ")
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

      // -------------------------------------------------------
      // POLKA DOTS
      // -------------------------------------------------------

      var PATTERN_TYPES = {
        POLKA: 'polka',
        STRIPES: 'stripes',
        CHEVRON: 'chevron'
      };

      var activePatternType = null;
      var activePatternColor = '#ff6b6b';
      var activePatternBg = '#ffffff';

      function applyPatternToModel(
        patternType,
        color,
        bgColor
      ) {
        activePatternType = patternType;
        activePatternColor =
          color || '#ff6b6b';
        activePatternBg =
          bgColor || '#ffffff';
        PMG_PATTERN_ACTIVE = true;

        window.dispatchEvent(
          new CustomEvent(
            "pmg-shirt-pattern-change",
            {
              detail: {
                pattern: patternType,
                color: activePatternColor,
                bgColor: activePatternBg
              }
            }
          )
        );

        setDesignDirty(true);
      }

      function removePatternFromModel() {
        PMG_PATTERN_ACTIVE = false;
        activePatternType = null;

        window.dispatchEvent(
          new CustomEvent(
            "pmg-shirt-pattern-change",
            {
              detail: {
                pattern: null
              }
            }
          )
        );

        var oldPattern =
          document.getElementById(
            PMG_PATTERN_ID
          );

        if (oldPattern) {
          oldPattern.remove();
        }

        var oldStyle =
          document.getElementById(
            PMG_PATTERN_ID +
              "-style"
          );

        if (oldStyle) {
          oldStyle.remove();
        }
      }

      // -------------------------------------------------------
      // PATTERN PANEL
      // -------------------------------------------------------

      function createPatternPanel() {
        if (
          document.getElementById(
            "pmg-mobile-pattern-panel"
          )
        ) {
          return;
        }

        var patterns = [
          {
            id: 'polka-red',
            name: 'Red Polka Dots',
            type: PATTERN_TYPES.POLKA,
            color: '#ff6b6b',
            bg: '#ffffff'
          },
          {
            id: 'polka-blue',
            name: 'Blue Polka Dots',
            type: PATTERN_TYPES.POLKA,
            color: '#4a90d9',
            bg: '#ffffff'
          },
          {
            id: 'polka-black',
            name: 'Black Polka Dots',
            type: PATTERN_TYPES.POLKA,
            color: '#000000',
            bg: '#ffffff'
          },
          {
            id: 'stripes-red',
            name: 'Red Stripes',
            type: PATTERN_TYPES.STRIPES,
            color: '#ff6b6b',
            bg: '#ffffff'
          },
          {
            id: 'stripes-blue',
            name: 'Blue Stripes',
            type: PATTERN_TYPES.STRIPES,
            color: '#4a90d9',
            bg: '#ffffff'
          },
          {
            id: 'chevron-black',
            name: 'Black Chevron',
            type: PATTERN_TYPES.CHEVRON,
            color: '#000000',
            bg: '#ffffff'
          },
        ];

        var panel =
          document.createElement(
            "div"
          );

        panel.id =
          "pmg-mobile-pattern-panel";

        var html =
          '<div class="pmg-pattern-title">PATTERNS</div>';

        patterns.forEach(function(p) {
          var bgStyle = p.bg;
          var dotColor = p.color;

          html +=
            '<button type="button" class="pmg-pattern-option" data-pattern="' +
            p.id +
            '" data-type="' +
            p.type +
            '" data-color="' +
            p.color +
            '" data-bg="' +
            p.bg +
            '">';

          html +=
            '<span class="pmg-pattern-preview" style="background: ' +
            bgStyle +
            '; background-image: radial-gradient(circle, ' +
            dotColor +
            ' 0 4px, transparent 4.5px); background-size: 16px 16px;"></span>';

          html +=
            '<span>' +
            p.name +
            '</span>';

          html +=
            '</button>';
        });

        html +=
          '<button class="pmg-pattern-close" type="button">‹ Back</button>';

        panel.innerHTML =
          html;

        document.body.appendChild(
          panel
        );

        panel
          .querySelectorAll(
            '[data-pattern]'
          )
          .forEach(
            function(btn) {
              btn.addEventListener(
                "click",
                function(e) {
                  e.preventDefault();
                  e.stopPropagation();

                  var patternType =
                    this.dataset.type;

                  var color =
                    this.dataset.color;

                  var bg =
                    this.dataset.bg;

                  applyPatternToModel(
                    patternType,
                    color,
                    bg
                  );

                  // Close panel after selection
                  var panelEl =
                    document.getElementById(
                      "pmg-mobile-pattern-panel"
                    );

                  if (panelEl) {
                    panelEl.classList.remove(
                      "open"
                    );
                  }

                  // Update button states
                  document
                    .querySelectorAll(
                      '.pmg-pattern-option'
                    )
                    .forEach(
                      function(b) {
                        b.style.border =
                          '1px solid rgba(255,255,255,0.12)';
                      }
                    );

                  this.style.border =
                    '2px solid #10b981';
                }
              );
            }
          );

        panel
          .querySelector(
            ".pmg-pattern-close"
          )
          .addEventListener(
            "click",
            function(e) {
              e.preventDefault();
              e.stopPropagation();

              panel.classList.remove(
                "open"
              );

              removePatternFromModel();
            }
          );
      }

      function openPatternPanel() {
        createPatternPanel();

        var panel =
          document.getElementById(
            "pmg-mobile-pattern-panel"
          );

        if (panel) {
          panel.classList.add(
            "open"
          );
        }
      }

      // -------------------------------------------------------
      // MOBILE MENU
      // -------------------------------------------------------

      function createVerticalMenu() {
        if (
          document.getElementById(
            MENU_ID
          )
        ) {
          return;
        }

        var menu =
          document.createElement(
            "div"
          );

        menu.id =
          MENU_ID;

        var tools = [
          {
            label: "SPECS",
            icon: "☷",
          },
          {
            label: "COLORS",
            icon: "🎨",
          },
          {
            label: "GALLERY",
            icon: "▣",
          },
          {
            label: "AI",
            icon: "✦",
          },
          {
            label: "TEXT",
            icon: "A",
          },
          {
            label: "PATTERNS",
            icon: "◉",
          },
        ];

        tools.forEach(
          function(tool) {
            var button =
              document.createElement(
                "button"
              );

            button.type =
              "button";

            button.className =
              "pmg-mobile-tool-button";

            button.setAttribute(
              "data-tool",
              tool.label
            );

            button.innerHTML =
              '<span class="pmg-mobile-tool-icon">' +
              tool.icon +
              "</span>" +
              '<span class="pmg-mobile-tool-label">' +
              tool.label +
              "</span>";

            button.addEventListener(
              "click",
              function(event) {
                event.preventDefault();
                event.stopPropagation();

                var isOpen =
                  document.body.classList.contains(
                    "pmg-tool-open"
                  );

                if (
                  button.classList.contains(
                    "active"
                  ) &&
                  isOpen
                ) {
                  document.body.classList.remove(
                    "pmg-tool-open"
                  );

                  button.classList.remove(
                    "active"
                  );

                  // Close pattern panel if open
                  var patternPanel =
                    document.getElementById(
                      "pmg-mobile-pattern-panel"
                    );

                  if (patternPanel) {
                    patternPanel.classList.remove(
                      "open"
                    );
                  }

                  return;
                }

                // ------------------------------------------------
                // PATTERNS
                // ------------------------------------------------

                if (
                  tool.label ===
                  "PATTERNS"
                ) {
                  openPatternPanel();

                  document
                    .querySelectorAll(
                      ".pmg-mobile-tool-button"
                    )
                    .forEach(
                      function(item) {
                        item.classList.remove(
                          "active"
                        );
                      }
                    );

                  button.classList.add(
                    "active"
                  );

                  document.body.classList.add(
                    "pmg-tool-open"
                  );

                  return;
                }

                var realButton =
                  findRealButton(
                    tool.label
                  );

                if (!realButton) {
                  return;
                }

                setDesignDirty(
                  true
                );

                realButton.click();

                document.body.classList.add(
                  "pmg-tool-open"
                );

                // Add Back button after the
                // selected customization panel opens.
                setTimeout(
                  function() {
                    addCustomizationBackButton();
                  },
                  100
                );

                document
                  .querySelectorAll(
                    ".pmg-mobile-tool-button"
                  )
                  .forEach(
                    function(item) {
                      item.classList.remove(
                        "active"
                      );
                    }
                  );

                button.classList.add(
                  "active"
                );
              }
            );

            menu.appendChild(
              button
            );
          }
        );

        document.body.appendChild(
          menu
        );
      }

      // -------------------------------------------------------
      // DESIGN CHANGE DETECTION
      // -------------------------------------------------------

      function setupDesignChangeDetection() {
        if (
          DESIGN_CHANGE_LISTENER_READY
        ) {
          return;
        }

        DESIGN_CHANGE_LISTENER_READY =
          true;

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

                  removePatternFromModel();
                },
                150
              );

              return;
            }

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

            var sidebar =
              target.closest(
                ".tsc-left-docked, .tsc-sidebar"
              );

            if (sidebar) {
              setDesignDirty(
                true
              );
            }

            var interactive =
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

            var previewArea =
              target.closest(
                ".tsc-right-preview, .tsc-preview-panel, .tsc-preview-3d, canvas"
              );

            if (previewArea) {
              setDesignDirty(
                true
              );
            }
          },
          true
        );

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

                var previewArea =
                  target.closest &&
                  target.closest(
                    ".tsc-right-preview, .tsc-preview-panel, .tsc-preview-3d, canvas"
                  );

                if (
                  previewArea
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

      // -------------------------------------------------------
      // STYLES
      // -------------------------------------------------------

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

        style.innerHTML =

          // FULL PAGE
          "html,body,#root,.pd-page,.po-page,.pd-customizer-page-wrapper,.pd-customizer-page-body {" +
          "margin:0 !important;" +
          "padding:0 !important;" +
          "width:100% !important;" +
          "max-width:100vw !important;" +
          "height:100% !important;" +
          "min-height:100% !important;" +
          "background:#1d2333 !important;" +
          "overflow:hidden !important;" +
          "}" +

          // CUSTOMIZER ROOT
          ".tsc-root {" +
          "position:relative !important;" +
          "width:100% !important;" +
          "max-width:100vw !important;" +
          "height:100% !important;" +
          "min-height:100% !important;" +
          "margin:0 !important;" +
          "padding:0 !important;" +
          "background:#1d2333 !important;" +
          "overflow:hidden !important;" +
          "}" +

          // MAIN LAYOUT
          ".tsc-3col-layout,.tsc-4col-layout {" +
          "position:relative !important;" +
          "width:100% !important;" +
          "max-width:100vw !important;" +
          "height:100% !important;" +
          "min-height:100% !important;" +
          "margin:0 !important;" +
          "padding:0 !important;" +
          "background:#1d2333 !important;" +
          "overflow:hidden !important;" +
          "}" +

          // 3D PREVIEW
          ".tsc-right-preview {" +
          "position:absolute !important;" +
          "top:0 !important;" +
          "left:0 !important;" +
          "right:0 !important;" +
          "bottom:0 !important;" +
          "width:100% !important;" +
          "height:100% !important;" +
          "margin:0 !important;" +
          "padding:0 !important;" +
          "background:#1d2333 !important;" +
          "border:none !important;" +
          "display:flex !important;" +
          "align-items:center !important;" +
          "justify-content:center !important;" +
          "overflow:hidden !important;" +
          "z-index:1 !important;" +
          "pointer-events:auto !important;" +
          "}" +

          ".tsc-preview-panel {" +
          "width:100% !important;" +
          "height:100% !important;" +
          "min-height:100% !important;" +
          "margin:0 !important;" +
          "padding:0 !important;" +
          "background:#1d2333 !important;" +
          "border:none !important;" +
          "display:flex !important;" +
          "align-items:center !important;" +
          "justify-content:center !important;" +
          "overflow:hidden !important;" +
          "pointer-events:auto !important;" +
          "}" +

          ".tsc-preview-3d {" +
          "width:100% !important;" +
          "height:100% !important;" +
          "min-height:100% !important;" +
          "margin:0 !important;" +
          "padding:0 !important;" +
          "background:#1d2333 !important;" +
          "border:none !important;" +
          "box-shadow:none !important;" +
          "display:flex !important;" +
          "align-items:center !important;" +
          "justify-content:center !important;" +
          "overflow:hidden !important;" +
          "pointer-events:auto !important;" +
          "}" +

          // HIDDEN NODES
          '[data-pmg-original-toolbar="hidden"] {' +
          "display:none !important;" +
          "}" +

          '[data-pmg-original-design-actions="hidden"] {' +
          "display:none !important;" +
          "}" +

          '[data-pmg-extra-white-navigation="hidden"] {' +
          "display:none !important;" +
          "}" +

          // ---------------------------------------------------
          // VERTICAL MOBILE MENU
          // ---------------------------------------------------

          "#pmg-mobile-customizer-menu {" +
          "position:fixed !important;" +
          "top:50% !important;" +
          "right:10px !important;" +
          "transform:translateY(-50%) !important;" +
          "width:56px !important;" +
          "padding:6px 3px !important;" +
          "margin:0 !important;" +
          "display:flex !important;" +
          "flex-direction:column !important;" +
          "gap:3px !important;" +
          "background:rgba(37,52,73,0.8) !important;" +
          "border-radius:14px !important;" +
          "box-shadow:0 4px 15px rgba(0,0,0,0.3) !important;" +
          "z-index:999999 !important;" +
          "backdrop-filter:blur(10px) !important;" +
          "-webkit-backdrop-filter:blur(10px) !important;" +
          "border:1px solid rgba(255,255,255,0.05) !important;" +
          "}" +

          ".pmg-mobile-tool-button {" +
          "width:100% !important;" +
          "height:44px !important;" +
          "padding:3px 2px !important;" +
          "margin:0 !important;" +
          "border:none !important;" +
          "border-radius:10px !important;" +
          "background:transparent !important;" +
          "color:#dbe7f4 !important;" +
          "display:flex !important;" +
          "flex-direction:column !important;" +
          "align-items:center !important;" +
          "justify-content:center !important;" +
          "gap:1px !important;" +
          "cursor:pointer !important;" +
          "pointer-events:auto !important;" +
          "touch-action:manipulation !important;" +
          "transition:all 0.15s ease !important;" +
          "}" +

          ".pmg-mobile-tool-button:hover {" +
          "background:rgba(255,255,255,0.05) !important;" +
          "}" +

          ".pmg-mobile-tool-button.active {" +
          "background:rgba(64,83,109,0.6) !important;" +
          "color:#ffffff !important;" +
          "transform:scale(1.05) !important;" +
          "}" +

          ".pmg-mobile-tool-icon {" +
          "display:block !important;" +
          "font-size:17px !important;" +
          "line-height:19px !important;" +
          "width:19px !important;" +
          "height:19px !important;" +
          "text-align:center !important;" +
          "}" +

          ".pmg-mobile-tool-label {" +
          "display:block !important;" +
          "font-size:6px !important;" +
          "line-height:8px !important;" +
          "font-weight:700 !important;" +
          "text-transform:uppercase !important;" +
          "white-space:nowrap !important;" +
          "letter-spacing:0.2px !important;" +
          "opacity:0.7 !important;" +
          "}" +

          ".pmg-mobile-tool-button.active .pmg-mobile-tool-label {" +
          "opacity:1 !important;" +
          "}" +

          // ---------------------------------------------------
          // ORIGINAL SIDEBAR
          // ---------------------------------------------------

          ".tsc-left-docked,.tsc-sidebar {" +
          "position:fixed !important;" +
          "top:60px !important;" +
          "left:10px !important;" +
          "bottom:60px !important;" +
          "width:300px !important;" +
          "max-width:calc(100vw - 80px) !important;" +
          "background:rgba(29,35,51,0.88) !important;" +
          "border-radius:16px !important;" +
          "padding:16px !important;" +
          "overflow-y:auto !important;" +
          "overflow-x:hidden !important;" +
          "z-index:99998 !important;" +
          "pointer-events:none !important;" +
          "opacity:0 !important;" +
          "visibility:hidden !important;" +
          "transform:translateX(-30px) scale(0.95) !important;" +
          "transition:all 0.3s cubic-bezier(0.4,0,0.2,1) !important;" +
          "box-shadow:0 10px 40px rgba(0,0,0,0.5) !important;" +
          "border:1px solid rgba(255,255,255,0.06) !important;" +
          "backdrop-filter:blur(20px) !important;" +
          "-webkit-backdrop-filter:blur(20px) !important;" +
          "}" +

          "body.pmg-tool-open .tsc-left-docked,body.pmg-tool-open .tsc-sidebar {" +
          "pointer-events:auto !important;" +
          "opacity:1 !important;" +
          "visibility:visible !important;" +
          "transform:translateX(0) scale(1) !important;" +
          "}" +

          ".tsc-left-docked *,.tsc-sidebar * {" +
          "pointer-events:auto !important;" +
          "}" +

          ".tsc-right-preview {" +
          "cursor:pointer !important;" +
          "}" +

          ".tsc-root button,.tsc-root input,.tsc-root select,.tsc-root textarea,.tsc-root label,.tsc-root [role='button'] {" +
          "pointer-events:auto !important;" +
          "}" +

          // ---------------------------------------------------
          // CUSTOMIZATION BACK BUTTON
          // ---------------------------------------------------

          ".pmg-customization-back-button {" +
          "width:100% !important;" +
          "height:42px !important;" +
          "margin:0 0 14px 0 !important;" +
          "padding:0 12px !important;" +
          "border:1px solid rgba(255,255,255,0.10) !important;" +
          "border-radius:10px !important;" +
          "background:rgba(255,255,255,0.06) !important;" +
          "color:#ffffff !important;" +
          "display:flex !important;" +
          "align-items:center !important;" +
          "justify-content:flex-start !important;" +
          "gap:7px !important;" +
          "font-size:13px !important;" +
          "font-weight:700 !important;" +
          "cursor:pointer !important;" +
          "pointer-events:auto !important;" +
          "touch-action:manipulation !important;" +
          "box-sizing:border-box !important;" +
          "}" +

          ".pmg-customization-back-button:active {" +
          "background:rgba(255,255,255,0.12) !important;" +
          "transform:scale(0.98) !important;" +
          "}" +

          ".pmg-customization-back-icon {" +
          "font-size:27px !important;" +
          "font-weight:300 !important;" +
          "line-height:18px !important;" +
          "display:flex !important;" +
          "align-items:center !important;" +
          "justify-content:center !important;" +
          "width:20px !important;" +
          "height:20px !important;" +
          "}" +

          // ---------------------------------------------------
          // POLKA DOT PANEL
          // ---------------------------------------------------

          "#pmg-mobile-pattern-panel {" +
          "position:fixed !important;" +
          "left:10px !important;" +
          "bottom:60px !important;" +
          "width:260px !important;" +
          "padding:14px !important;" +
          "background:rgba(29,35,51,0.96) !important;" +
          "border:1px solid rgba(255,255,255,0.08) !important;" +
          "border-radius:14px !important;" +
          "box-shadow:0 10px 35px rgba(0,0,0,0.45) !important;" +
          "z-index:1000000 !important;" +
          "display:none !important;" +
          "color:#ffffff !important;" +
          "}" +

          "#pmg-mobile-pattern-panel.open {" +
          "display:block !important;" +
          "}" +

          ".pmg-pattern-title {" +
          "font-size:13px !important;" +
          "font-weight:800 !important;" +
          "margin-bottom:10px !important;" +
          "letter-spacing:0.4px !important;" +
          "}" +

          ".pmg-pattern-option {" +
          "width:100% !important;" +
          "min-height:56px !important;" +
          "border:1px solid rgba(255,255,255,0.12) !important;" +
          "border-radius:10px !important;" +
          "background:rgba(255,255,255,0.06) !important;" +
          "color:#ffffff !important;" +
          "display:flex !important;" +
          "align-items:center !important;" +
          "gap:12px !important;" +
          "padding:7px !important;" +
          "font-size:12px !important;" +
          "font-weight:700 !important;" +
          "margin-bottom:6px !important;" +
          "transition:all 0.2s !important;" +
          "}" +

          ".pmg-pattern-option:hover {" +
          "background:rgba(255,255,255,0.12) !important;" +
          "transform:scale(1.02) !important;" +
          "}" +

          ".pmg-pattern-preview {" +
          "width:44px !important;" +
          "height:38px !important;" +
          "border-radius:7px !important;" +
          "display:block !important;" +
          "flex-shrink:0 !important;" +
          "border:1px solid rgba(255,255,255,0.1) !important;" +
          "}" +

          ".pmg-pattern-close {" +
          "margin-top:8px !important;" +
          "width:100% !important;" +
          "height:36px !important;" +
          "border:none !important;" +
          "border-radius:9px !important;" +
          "background:rgba(255,255,255,0.08) !important;" +
          "color:#cbd5e1 !important;" +
          "font-size:11px !important;" +
          "font-weight:700 !important;" +
          "}" +

          // ---------------------------------------------------
          // HIDE CHATBOT
          // ---------------------------------------------------

          ".phc-fab,.phc-window,.chatbot-container,.chatbot-toggle-btn,.ph-chatbot-fab,.chatbot-wrapper,#printhub-chatbot-root,.printhub-chatbot-btn {" +
          "display:none !important;" +
          "}" +

          // ---------------------------------------------------
          // REMOVE SCROLLBARS
          // ---------------------------------------------------

          "*::-webkit-scrollbar {" +
          "display:none !important;" +
          "width:0 !important;" +
          "height:0 !important;" +
          "}" +

          "* {" +
          "scrollbar-width:none !important;" +
          "-ms-overflow-style:none !important;" +
          "}";
      }

      // -------------------------------------------------------
      // ADD BACK BUTTON TO EACH CUSTOMIZATION PANEL
      // -------------------------------------------------------

      function addCustomizationBackButton() {
        var sidebar =
          document.querySelector(
            ".tsc-left-docked, .tsc-sidebar"
          );

        if (!sidebar) {
          return;
        }

        var existing =
          sidebar.querySelector(
            ".pmg-customization-back-button"
          );

        if (existing) {
          return;
        }

        var backButton =
          document.createElement("button");

        backButton.type =
          "button";

        backButton.className =
          "pmg-customization-back-button";

        backButton.innerHTML =
          '<span class="pmg-customization-back-icon">‹</span>' +
          '<span>Back</span>';

        backButton.addEventListener(
          "click",
          function(event) {
            event.preventDefault();
            event.stopPropagation();

            closePanel();
          }
        );

        sidebar.insertBefore(
          backButton,
          sidebar.firstChild
        );
      }

      // -------------------------------------------------------
      // CLOSE PANEL
      // -------------------------------------------------------

      function closePanel() {
        document.body.classList.remove(
          "pmg-tool-open"
        );

        var patternPanel =
          document.getElementById(
            "pmg-mobile-pattern-panel"
          );

        if (patternPanel) {
          patternPanel.classList.remove(
            "open"
          );
        }

        document
          .querySelectorAll(
            ".pmg-mobile-tool-button"
          )
          .forEach(
            function(item) {
              item.classList.remove(
                "active"
              );
            }
          );
      }

      // -------------------------------------------------------
      // CLOSE ON BACKGROUND
      // -------------------------------------------------------

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
              e.target ===
                preview ||
              e.target.classList.contains(
                "tsc-preview-panel"
              )
            ) {
              closePanel();
            }
          }
        );
      }

      // -------------------------------------------------------
      // INITIALIZE
      // -------------------------------------------------------

      function initialize() {
        hideOriginalToolbar();
        hideExtraWhiteNavigation();
        hideOriginalDesignActions();
        applyStyles();
        createVerticalMenu();
        addCloseOnBackgroundClick();
        setupDesignChangeDetection();
        detectInitialDesignState();

        if (
          document.body.classList.contains(
            "pmg-tool-open"
          )
        ) {
          addCustomizationBackButton();
        }
      }

      initialize();

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

      // -------------------------------------------------------
      // MUTATION OBSERVER
      // -------------------------------------------------------

      var observer =
        new MutationObserver(
          function() {
            hideOriginalToolbar();
            hideExtraWhiteNavigation();
            hideOriginalDesignActions();
            applyStyles();
            createVerticalMenu();
            detectInitialDesignState();

            if (
              document.body.classList.contains(
                "pmg-tool-open"
              )
            ) {
              addCustomizationBackButton();
            }
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

  // ---------------------------------------------------------
  // WEBVIEW MESSAGE
  // ---------------------------------------------------------

  const handleWebViewMessage = (
    event
  ) => {
    try {
      const data = JSON.parse(
        event.nativeEvent.data
      );

      if (
        data.type ===
        "DESIGN_STATE"
      ) {
        setDesignDirty(
          !!data.dirty
        );

        return;
      }

      if (
        data.type ===
        "DESIGN_COMPLETED"
      ) {
        Alert.alert(
          "Design Applied",
          "Your 3D customization has been synchronized!",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.navigate({
                  name: "ProductDetail",
                  params: {
                    product,
                    completedDesign:
                      data.design,
                  },
                  merge: true,
                });
              },
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

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#071323"
      />

      <View
        style={styles.mobileHeader}
      >
        <TouchableOpacity
          style={styles.clearButton}
          onPress={
            handleClearAll
          }
          activeOpacity={0.8}
          disabled={!designDirty}
        >
          <Text
            style={[
              styles.clearButtonText,
              !designDirty &&
                styles.clearButtonTextDisabled,
            ]}
          >
            Clear All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.useDesignButton,
            !designDirty &&
              styles.useDesignButtonDisabled,
          ]}
          onPress={
            handleUseThisDesign
          }
          activeOpacity={0.8}
          disabled={!designDirty}
        >
          <Text
            style={[
              styles.useDesignButtonText,
              !designDirty &&
                styles.useDesignButtonTextDisabled,
            ]}
          >
            Use this Design
          </Text>
        </TouchableOpacity>
      </View>

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
          style={styles.webview}
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
    </SafeAreaView>
  );
}

// ---------------------------------------------------------
// STYLES
// ---------------------------------------------------------

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        "#1e2434",
    },

    mobileHeader: {
      backgroundColor:
        "#1e2434",
      height: 58,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "flex-end",
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor:
        "rgba(130, 45, 45, 0.04)",
    },

    clearButton: {
      minWidth: 94,
      height: 42,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor:
        "#d7e0e8",
      borderRadius: 60,
      backgroundColor:
        "#f5f8fb",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    clearButtonText: {
      color: "#526174",
      fontSize: 13,
      fontWeight:
        "600",
    },

    clearButtonTextDisabled: {
      color: "#a9b4c0",
    },

    useDesignButton: {
      minWidth: 150,
      height: 42,
      paddingHorizontal: 18,
      borderRadius: 60,
      backgroundColor:
        "#10b981",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 10,
    },

    useDesignButtonDisabled: {
      backgroundColor:
        "#dce3e9",
    },

    useDesignButtonText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight:
        "700",
    },

    useDesignButtonTextDisabled: {
      color: "#8a98a8",
    },

    webviewContainer: {
      flex: 1,
      backgroundColor:
        "#1d2333",
    },

    webview: {
      flex: 1,
      backgroundColor:
        "#1d2333",
    },
  });