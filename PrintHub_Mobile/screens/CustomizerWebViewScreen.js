//customizerWebViewScreen.js
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
import { WEB_APP_URL, API_BASE_URL } from "../config";

const CUSTOMIZE_CATEGORIES = [
  { key: "COLORS", label: "Colors", icon: "🎨", target: "COLORS" },
  { key: "SPECS", label: "Specs", icon: "📐", target: "SPECS" },
  { key: "TEMPLATES", label: "Templates", icon: "🗂", target: "TEMPLATES" },
  { key: "GRAPHICS", label: "Graphics & Shapes", icon: "✦", target: "GRAPHICS" },
  { key: "TEXT", label: "Text", icon: "A", target: "TEXT" },
  { key: "AI", label: "AI Design", icon: "✨", target: "AI" },
  { key: "LAYERS", label: "Layers", icon: "▤", target: "LAYERS_PANEL" },
  { key: "MORE", label: "Uploads", icon: "⋯", target: "GALLERY" },
];

const SIDES = ["Front", "Back", "Left", "Right"];

export default function CustomizerWebViewScreen({ route, navigation }) {
  const { product, selectedOptions } = route.params || {};
  const productId = product?.id;

  const [userJson, setUserJson] = useState(null);
  const [designDirty, setDesignDirty] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSide, setActiveSide] = useState("Front");

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

  const handleSideChange = (side) => {
    setActiveSide(side);

    runWebViewScript(`
      if (window.__PMG_SET_VIEW__) {
        window.__PMG_SET_VIEW__(${JSON.stringify(side.toLowerCase())});
      }
    `);
  };

  const openCategory = (cat) => {
    setSheetOpen(false);
    setActiveCategory(cat.key);

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
        window.__PMG_OPEN_CATEGORY__(${JSON.stringify(cat.target)});
      }
    `);
  };

  const closeActiveCategory = () => {
    setActiveCategory(null);

    runWebViewScript(`
      if (window.__PMG_CLOSE_CATEGORY__) {
        window.__PMG_CLOSE_CATEGORY__();
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

      // --- error/network capture, sent back to RN console ---
      window.addEventListener("error", function(e) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "PMG_DEBUG_ERROR",
            message: e.message,
            source: e.filename,
            line: e.lineno,
          }));
        }
      });

      window.addEventListener("unhandledrejection", function(e) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "PMG_DEBUG_ERROR",
            message: "Unhandled rejection: " + (e.reason?.message || e.reason),
          }));
        }
      });

      var _origFetch = window.fetch;
      window.fetch = function() {
        return _origFetch.apply(this, arguments).catch(function(err) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: "PMG_DEBUG_ERROR",
              message: "Fetch failed: " + arguments[0] + " — " + err.message,
            }));
          }
          throw err;
        });
      };
      var STYLE_ID = "pmg-mobile-customizer-style";

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

      window.__PMG_OPEN_CATEGORY__ = function(label) {
        var button = findRealButton(label);

        if (button) {
          button.click();
          document.body.classList.add("pmg-tool-open");
          setDesignDirty(true);
        }
      };

      window.__PMG_CLOSE_CATEGORY__ = function() {
        closePanel();
      };

      // Layers has no tab button of its own - LayersPanel renders
      // persistently under whichever tab is active - so this just
      // reveals the sidebar and scrolls it into view instead of
      // clicking anything.
      window.__PMG_OPEN_LAYERS__ = function() {
        document.body.classList.add("pmg-tool-open");

        var scrollToBottom = function() {
          var container = document.querySelector(".tsc-left-docked, .tsc-sidebar");
          if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
          }
        };

        // Two passes: once the sheet has finished sliding up, and again
        // shortly after in case layer thumbnails are still loading and
        // changing the sidebar's scrollHeight out from under the first scroll.
        setTimeout(scrollToBottom, 300);
        setTimeout(scrollToBottom, 700);
      };

      var DESIGN_DIRTY = false;
      var DESIGN_STATE_INITIALIZED = false;
      var DESIGN_CHANGE_LISTENER_READY = false;
      var LAST_SENT_DIRTY = null;

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
          "display:flex !important;" +
          "flex-direction:column !important;" +
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
          "position:relative !important;" +
          "width:100% !important;" +
          "height:100% !important;" +
          "flex:1 1 auto !important;" +
          "margin:0 !important;" +
          "padding:0 !important;" +
          "background:#1d2333 !important;" +
          "border:none !important;" +
          "display:flex !important;" +
          "flex-direction:column !important;" +
          "align-items:stretch !important;" +
          "justify-content:flex-start !important;" +
          "overflow:hidden !important;" +
          "z-index:1 !important;" +
          "pointer-events:auto !important;" +
          "}" +

          ".tsc-right-preview .tsc-preview-panel {" +
          "height:100% !important;" +
          "min-height:0 !important;" +
          "flex:1 1 auto !important;" +
          "}" +

          ".tsc-right-preview .tsc-preview-3d {" +
          "height:100% !important;" +
          "min-height:0 !important;" +
          "max-height:none !important;" +
          "flex:1 1 auto !important;" +
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
          // ORIGINAL SIDEBAR
          // ---------------------------------------------------

          ".tsc-left-docked,.tsc-sidebar {" +
          "position:fixed !important;" +
          "top:auto !important;" +
          "left:0 !important;" +
          "right:0 !important;" +
          "bottom:0 !important;" +
          "width:100% !important;" +
          "max-width:100% !important;" +
          "max-height:78% !important;" +
          "background:#1d2333 !important;" +
          "border-radius:20px 20px 0 0 !important;" +
          "padding:14px 16px 20px !important;" +
          "overflow-y:auto !important;" +
          "overflow-x:hidden !important;" +
          "-webkit-overflow-scrolling:touch !important;" +
          "z-index:99998 !important;" +
          "pointer-events:none !important;" +
          "opacity:0 !important;" +
          "visibility:hidden !important;" +
          "transform:translateY(24px) !important;" +
          "transition:transform 0.25s ease,opacity 0.25s ease,visibility 0.25s !important;" +
          "box-shadow:0 -8px 30px rgba(0,0,0,0.45) !important;" +
          "border:1px solid rgba(255,255,255,0.08) !important;" +
          "border-bottom:none !important;" +
          "box-sizing:border-box !important;" +
          "}" +

          "body.pmg-tool-open .tsc-left-docked,body.pmg-tool-open .tsc-sidebar {" +
          "pointer-events:auto !important;" +
          "opacity:1 !important;" +
          "visibility:visible !important;" +
          "transform:translateY(0) !important;" +
          "}" +

          ".tsc-left-docked::before,.tsc-sidebar::before {" +
          "content:'' !important;" +
          "display:block !important;" +
          "width:36px !important;" +
          "height:4px !important;" +
          "border-radius:4px !important;" +
          "background:rgba(255,255,255,0.25) !important;" +
          "margin:0 auto 12px !important;" +
          "}" +

          ".tsc-sidebar-section {" +
          "border-radius:14px !important;" +
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
      // CLOSE PANEL
      // -------------------------------------------------------

      function closePanel() {
        document.body.classList.remove(
          "pmg-tool-open"
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
        addCloseOnBackgroundClick();
        setupDesignChangeDetection();
        detectInitialDesignState();
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

  // ---------------------------------------------------------
  // WEBVIEW MESSAGE
  // ---------------------------------------------------------

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "DESIGN_STATE") {
        setDesignDirty(!!data.dirty);

        return;
      }

      if (data.type === "PMG_DEBUG_ERROR") {
        console.log("[PMG_DEBUG_ERROR]", data.message, data.source, data.line);
        return;
      }

      if (data.type === "DESIGN_COMPLETED") {
        Alert.alert("Success", "Added to cart with custom options!", [
          {
            text: "OK",
            onPress: () =>
              navigation.navigate("Main", {
                screen: "CartTab",
              }),
          },
        ]);
      }
    } catch (err) {
      console.error("[handleWebViewMessage] {ParseEvent}: " + err.message);
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

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerIconButton}
        >
          <Text style={styles.headerIconText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Customize</Text>

        <TouchableOpacity
          onPress={handleUseThisDesign}
          disabled={!designDirty}
          style={styles.headerIconButton}
        >
          <Text
            style={[
              styles.headerCheckText,
              !designDirty && styles.headerCheckTextDisabled,
            ]}
          >
            ✓
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.clearRow}>
        <TouchableOpacity
          onPress={handleClearAll}
          disabled={!designDirty}
          style={styles.clearChip}
        >
          <Text
            style={[
              styles.clearChipText,
              !designDirty && styles.clearChipTextDisabled,
            ]}
          >
            Clear All
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

      <View style={styles.sideTabsRow}>
        {SIDES.map((side) => (
          <TouchableOpacity
            key={side}
            onPress={() => handleSideChange(side)}
            style={[
              styles.sideTab,
              activeSide === side && styles.sideTabActive,
            ]}
          >
            <Text
              style={[
                styles.sideTabText,
                activeSide === side && styles.sideTabTextActive,
              ]}
            >
              {side}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomBar}>
        {activeCategory ? (
          <TouchableOpacity
            style={styles.customizeButtonActive}
            onPress={closeActiveCategory}
            activeOpacity={0.85}
          >
            <Text style={styles.customizeButtonText}>
              ✕ Close{" "}
              {
                CUSTOMIZE_CATEGORIES.find(
                  (c) => c.key === activeCategory
                )?.label
              }
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.customizeButton}
            onPress={() => setSheetOpen(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.customizeButtonText}>☰ Customize</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setSheetOpen(false)}
        />

        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Customize</Text>

            <TouchableOpacity onPress={() => setSheetOpen(false)}>
              <Text style={styles.sheetClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sheetGrid}>
            {CUSTOMIZE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={styles.sheetItem}
                onPress={() => openCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={styles.sheetItemIcon}>{cat.icon}</Text>
                <Text style={styles.sheetItemLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
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

    header: {
      backgroundColor: "#1e2434",
      height: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255,255,255,0.06)",
    },

    headerIconButton: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },

    headerIconText: {
      color: "#dbe7f4",
      fontSize: 20,
      fontWeight: "600",
    },

    headerTitle: {
      color: "#ffffff",
      fontSize: 15,
      fontWeight: "700",
    },

    headerCheckText: {
      color: "#10b981",
      fontSize: 20,
      fontWeight: "800",
    },

    headerCheckTextDisabled: {
      color: "#4a5568",
    },

    clearRow: {
      backgroundColor: "#1e2434",
      paddingHorizontal: 12,
      paddingBottom: 8,
      alignItems: "flex-start",
    },

    clearChip: {
      height: 30,
      paddingHorizontal: 12,
      borderRadius: 60,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      alignItems: "center",
      justifyContent: "center",
    },

    clearChipText: {
      color: "#dbe7f4",
      fontSize: 12,
      fontWeight: "600",
    },

    clearChipTextDisabled: {
      color: "#5b6472",
    },

    sideTabsRow: {
      backgroundColor: "#1e2434",
      flexDirection: "row",
      justifyContent: "center",
      paddingVertical: 8,
      gap: 8,
    },

    sideTab: {
      minWidth: 64,
      height: 32,
      paddingHorizontal: 14,
      borderRadius: 60,
      backgroundColor: "rgba(255,255,255,0.06)",
      alignItems: "center",
      justifyContent: "center",
    },

    sideTabActive: {
      backgroundColor: "#10b981",
    },

    sideTabText: {
      color: "#9aa7b8",
      fontSize: 12,
      fontWeight: "600",
    },

    sideTabTextActive: {
      color: "#ffffff",
    },

    bottomBar: {
      backgroundColor: "#1e2434",
      paddingHorizontal: 12,
      paddingVertical: 10,
    },

    customizeButton: {
      height: 46,
      borderRadius: 60,
      backgroundColor: "#10b981",
      alignItems: "center",
      justifyContent: "center",
    },

    customizeButtonActive: {
      height: 46,
      borderRadius: 60,
      backgroundColor: "#3a4557",
      alignItems: "center",
      justifyContent: "center",
    },

    customizeButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "700",
    },

    sheetBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
    },

    sheet: {
      backgroundColor: "#1e2434",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 28,
    },

    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },

    sheetTitle: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "700",
    },

    sheetClose: {
      color: "#9aa7b8",
      fontSize: 18,
      fontWeight: "700",
    },

    sheetGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },

    sheetItem: {
      width: "48%",
      height: 72,
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.06)",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },

    sheetItemIcon: {
      fontSize: 20,
    },

    sheetItemLabel: {
      color: "#dbe7f4",
      fontSize: 12,
      fontWeight: "600",
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