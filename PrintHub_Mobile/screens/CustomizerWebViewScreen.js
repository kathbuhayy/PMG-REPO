import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WEB_APP_URL, API_BASE_URL } from "../config";

export default function CustomizerWebViewScreen({
  route,
  navigation,
}) {
  const { product, selectedOptions } = route.params || {};
  const productId = product?.id;

  const [userJson, setUserJson] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const webViewRef = useRef(null);

  useEffect(() => {
    GetLocalUser();
  }, []);

  const GetLocalUser = async () => {
    try {
      const savedUser = await AsyncStorage.getItem("user");
      if (savedUser) {
        setUserJson(savedUser);
      }
    } catch (err) {
      console.error("[GetLocalUser] {ReadStorage}: " + err.message);
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
      queryParts.push(`size=${encodeURIComponent(selectedOptions.size)}`);
    }
    if (selectedOptions.material) {
      queryParts.push(`material=${encodeURIComponent(selectedOptions.material)}`);
    }
    if (selectedOptions.side) {
      queryParts.push(`side=${encodeURIComponent(selectedOptions.side)}`);
    }
    if (selectedOptions.finishing) {
      queryParts.push(`finishing=${encodeURIComponent(selectedOptions.finishing)}`);
    }
    if (selectedOptions.color) {
      queryParts.push(`color=${encodeURIComponent(selectedOptions.color)}`);
    }
  }

  const targetUrl = `${WEB_APP_URL}/product/${productId}?` + queryParts.join("&");

  // ---------------------------------------------------------
  // SAVE FUNCTION
  // ---------------------------------------------------------

  const handleSaveDesign = async () => {
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      
      Alert.alert(
        "Design Saved",
        "Your custom design has been saved successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              navigation.goBack();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error("[SaveDesign] Error:", error);
      Alert.alert("Error", "Failed to save design. Please try again.");
    } finally {
      setIsSaving(false);
    }
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
  // WEBVIEW JAVASCRIPT - FORCE REMOVE HEADER
  // ---------------------------------------------------------

  const injectedPostLoadJS = `
    (function() {
      var STYLE_ID = "pmg-mobile-customizer-style";
      var MENU_ID = "pmg-mobile-customizer-menu";

      function findRealButton(label) {
        var wanted = String(label).toLowerCase().trim();
        var buttons = Array.from(document.querySelectorAll(".tsc-root button, button"));
        return buttons.find(function(button) {
          var text = (button.innerText || button.textContent || "")
            .replace(/\\s+/g, " ")
            .trim()
            .toLowerCase();
          return (
            text === wanted ||
            text.indexOf(wanted + " ") === 0 ||
            text.indexOf(" " + wanted + " ") !== -1
          );
        });
      }

      // -----------------------------------------------------
      // FORCE REMOVE HEADER
      // -----------------------------------------------------
      
      function forceRemoveHeader() {
        // Method 1: Remove by text content - the most reliable
        var allElements = document.querySelectorAll('*');
        allElements.forEach(function(element) {
          if (element.childNodes && element.childNodes.length === 1) {
            var text = element.innerText || element.textContent || '';
            if (text.trim() === '3D Customizer') {
              // Check if this is a header by looking at parent
              var parent = element.parentElement;
              if (parent) {
                // Remove the parent if it's a header container
                var parentTag = parent.tagName.toLowerCase();
                var parentClass = parent.className || '';
                if (parentTag === 'header' || 
                    parentTag === 'div' && (parentClass.includes('header') || parentClass.includes('title') || parentClass.includes('navbar'))) {
                  parent.remove();
                  return;
                }
              }
              element.remove();
            }
          }
        });

        // Method 2: Remove specific header classes
        var headerSelectors = [
          '.pd-customizer-page-header',
          '.pd-customizer-header',
          '.pd-customizer-header-left',
          '.pd-customizer-header-right',
          '.pd-customizer-back-btn',
          '.pd-customizer-title',
          '.tsc-header',
          '.customizer-header',
          '.page-header',
          '.product-header',
          '.customizer-title',
          '.tsc-title',
          '.header',
          '.navbar',
          '.top-bar',
          '.app-header'
        ];
        
        headerSelectors.forEach(function(selector) {
          document.querySelectorAll(selector).forEach(function(element) {
            element.remove();
          });
        });

        // Method 3: Hide all elements that contain "3D Customizer" and are at the top
        var topElements = document.querySelectorAll('body > *');
        topElements.forEach(function(element) {
          var text = element.innerText || '';
          if (text.includes('3D Customizer') && text.length < 30) {
            var rect = element.getBoundingClientRect();
            if (rect.top < 100) {
              element.remove();
            }
          }
        });

        // Method 4: Look for header with Save button next to it
        var allDivs = document.querySelectorAll('div');
        allDivs.forEach(function(div) {
          var text = div.innerText || '';
          if (text.includes('3D Customizer') && text.includes('Save')) {
            div.remove();
          }
        });
      }

      function findOriginalToolbar() {
        var labels = ["SPECS", "COLORS", "GALLERY", "AI", "TEXT"];
        var buttons = labels
          .map(function(label) {
            return { label: label, button: findRealButton(label) };
          })
          .filter(function(item) {
            return item.button;
          });
        if (buttons.length === 0) {
          return null;
        }
        var parent = buttons[0].button.parentElement;
        var depth = 0;
        while (parent && parent !== document.body && depth < 8) {
          var containsAll = buttons.every(function(item) {
            return parent.contains(item.button);
          });
          if (containsAll) {
            var rect = parent.getBoundingClientRect();
            if (rect.height < 150 || rect.width > window.innerWidth * 0.6) {
              return parent;
            }
          }
          parent = parent.parentElement;
          depth++;
        }
        return null;
      }

      function hideOriginalToolbar() {
        var toolbar = findOriginalToolbar();
        if (!toolbar) {
          return;
        }
        toolbar.setAttribute("data-pmg-original-toolbar", "hidden");
        toolbar.style.setProperty("display", "none", "important");
      }

      function createVerticalMenu() {
        if (document.getElementById(MENU_ID)) {
          return;
        }
        var menu = document.createElement("div");
        menu.id = MENU_ID;
        var tools = [
          { label: "SPECS", icon: "☷" },
          { label: "COLORS", icon: "🎨" },
          { label: "GALLERY", icon: "▣" },
          { label: "AI", icon: "✦" },
          { label: "TEXT", icon: "A" }
        ];
        tools.forEach(function(tool) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "pmg-mobile-tool-button";
          button.setAttribute("data-tool", tool.label);
          button.innerHTML =
            '<span class="pmg-mobile-tool-icon">' +
            tool.icon +
            '</span>' +
            '<span class="pmg-mobile-tool-label">' +
            tool.label +
            '</span>';
          button.addEventListener("click", function(event) {
            event.preventDefault();
            event.stopPropagation();
            
            var isOpen = document.body.classList.contains("pmg-tool-open");
            
            if (button.classList.contains("active") && isOpen) {
              document.body.classList.remove("pmg-tool-open");
              button.classList.remove("active");
              return;
            }
            
            var realButton = findRealButton(tool.label);
            if (!realButton) {
              return;
            }
            
            realButton.click();
            document.body.classList.add("pmg-tool-open");
            
            document.querySelectorAll(".pmg-mobile-tool-button").forEach(function(item) {
              item.classList.remove("active");
            });
            
            button.classList.add("active");
          });
          menu.appendChild(button);
        });
        document.body.appendChild(menu);
      }

      function applyStyles() {
        if (!document.head || !document.body) {
          return;
        }
        var style = document.getElementById(STYLE_ID);
        if (!style) {
          style = document.createElement("style");
          style.id = STYLE_ID;
          document.head.appendChild(style);
        }
        style.innerHTML =
          // COMPLETELY HIDE ALL HEADERS
          ".pd-customizer-page-header," +
          ".pd-customizer-header," +
          ".pd-customizer-header-left," +
          ".pd-customizer-header-right," +
          ".pd-customizer-back-btn," +
          ".pd-customizer-title," +
          ".tsc-header," +
          ".customizer-header," +
          ".page-header," +
          ".product-header," +
          ".customizer-title," +
          ".tsc-title," +
          ".header," +
          ".navbar," +
          ".top-bar," +
          ".app-header," +
          ".customizer-header-container," +
          ".header-container," +
          ".tsc-top-bar {" +
            "display:none !important;" +
            "visibility:hidden !important;" +
            "height:0 !important;" +
            "min-height:0 !important;" +
            "max-height:0 !important;" +
            "margin:0 !important;" +
            "padding:0 !important;" +
            "opacity:0 !important;" +
            "pointer-events:none !important;" +
            "position:absolute !important;" +
            "top:-9999px !important;" +
          "}" +
          
          // Full page setup
          "html,body,#root," +
          ".pd-page," +
          ".po-page," +
          ".pd-customizer-page-wrapper," +
          ".pd-customizer-page-body {" +
            "margin:0 !important;" +
            "padding:0 !important;" +
            "width:100% !important;" +
            "height:100% !important;" +
            "min-height:100% !important;" +
            "background:#1d2333 !important;" +
            "overflow:hidden !important;" +
          "}" +
          
          // Customizer root
          ".tsc-root {" +
            "position:relative !important;" +
            "width:100% !important;" +
            "height:100% !important;" +
            "min-height:100% !important;" +
            "margin:0 !important;" +
            "padding:0 !important;" +
            "background:#1d2333 !important;" +
            "overflow:hidden !important;" +
          "}" +
          
          // Main layout
          ".tsc-3col-layout," +
          ".tsc-4col-layout {" +
            "position:relative !important;" +
            "width:100% !important;" +
            "height:100% !important;" +
            "min-height:100% !important;" +
            "margin:0 !important;" +
            "padding:0 !important;" +
            "background:#1d2333 !important;" +
            "overflow:hidden !important;" +
          "}" +
          
          // 3D PREVIEW - Full screen
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
            "pointer-events:auto !important;" +
          "}" +
          
          // Hide original toolbar
          '[data-pmg-original-toolbar="hidden"] {' +
            "display:none !important;" +
          "}" +
          
          // VERTICAL MENU
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
          
          // Menu buttons
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
          
          // PANEL
          ".tsc-left-docked," +
          ".tsc-sidebar {" +
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
            "transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;" +
            "box-shadow:0 10px 40px rgba(0,0,0,0.5) !important;" +
            "border:1px solid rgba(255,255,255,0.06) !important;" +
            "backdrop-filter:blur(20px) !important;" +
            "-webkit-backdrop-filter:blur(20px) !important;" +
          "}" +
          
          "body.pmg-tool-open .tsc-left-docked," +
          "body.pmg-tool-open .tsc-sidebar {" +
            "pointer-events:auto !important;" +
            "opacity:1 !important;" +
            "visibility:visible !important;" +
            "transform:translateX(0) scale(1) !important;" +
          "}" +
          
          ".tsc-left-docked *," +
          ".tsc-sidebar * {" +
            "pointer-events:auto !important;" +
          "}" +
          
          ".tsc-right-preview {" +
            "cursor:pointer !important;" +
          "}" +
          
          ".tsc-root button," +
          ".tsc-root input," +
          ".tsc-root select," +
          ".tsc-root textarea," +
          ".tsc-root label," +
          ".tsc-root [role='button'] {" +
            "pointer-events:auto !important;" +
          "}" +
          
          ".phc-fab," +
          ".phc-window," +
          ".chatbot-container," +
          ".chatbot-toggle-btn," +
          ".ph-chatbot-fab," +
          ".chatbot-wrapper," +
          "#printhub-chatbot-root," +
          ".printhub-chatbot-btn {" +
            "display:none !important;" +
          "}" +
          
          ".tsc-left-docked::-webkit-scrollbar," +
          ".tsc-sidebar::-webkit-scrollbar {" +
            "width:4px !important;" +
          "}" +
          
          ".tsc-left-docked::-webkit-scrollbar-track," +
          ".tsc-sidebar::-webkit-scrollbar-track {" +
            "background:rgba(255,255,255,0.03) !important;" +
            "border-radius:2px !important;" +
          "}" +
          
          ".tsc-left-docked::-webkit-scrollbar-thumb," +
          ".tsc-sidebar::-webkit-scrollbar-thumb {" +
            "background:rgba(255,255,255,0.1) !important;" +
            "border-radius:2px !important;" +
          "}";
      }

      function closePanel() {
        document.body.classList.remove("pmg-tool-open");
        document.querySelectorAll(".pmg-mobile-tool-button").forEach(function(item) {
          item.classList.remove("active");
        });
      }

      function addCloseOnBackgroundClick() {
        var preview = document.querySelector('.tsc-right-preview');
        if (preview) {
          preview.addEventListener('click', function(e) {
            if (document.body.classList.contains("pmg-tool-open")) {
              if (e.target === preview || e.target.classList.contains('tsc-preview-panel')) {
                closePanel();
              }
            }
          });
        }
      }

      function initialize() {
        // Force remove header
        forceRemoveHeader();
        hideOriginalToolbar();
        applyStyles();
        createVerticalMenu();
        addCloseOnBackgroundClick();
        
        // Keep trying to remove header
        setInterval(forceRemoveHeader, 500);
      }

      initialize();

      setTimeout(initialize, 300);
      setTimeout(initialize, 700);
      setTimeout(initialize, 1200);
      setTimeout(initialize, 2000);
      setTimeout(initialize, 3000);

      var observer = new MutationObserver(function() {
        forceRemoveHeader();
        hideOriginalToolbar();
        applyStyles();
        createVerticalMenu();
      });

      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class']
        });
      }
    })();
    true;
  `;

  // ---------------------------------------------------------
  // WEBVIEW MESSAGE
  // ---------------------------------------------------------

  const HandleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "DESIGN_COMPLETED") {
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
                    completedDesign: data.design,
                  },
                  merge: true,
                });
              },
            },
          ]
        );
      }
    } catch (err) {
      console.error("[HandleWebViewMessage] {ParseEvent}: " + err.message);
    }
  };

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#071323" />

      <View style={styles.mobileHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          3D Customizer
        </Text>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSaveDesign}
          disabled={isSaving}
          activeOpacity={0.7}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.webviewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: targetUrl }}
          injectedJavaScriptBeforeContentLoaded={injectedPreLoadJS}
          injectedJavaScript={injectedPostLoadJS}
          onMessage={HandleWebViewMessage}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={["*"]}
          mixedContentMode="always"
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn("[WebViewError]", nativeEvent);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#071323",
  },

  mobileHeader: {
    height: 56,
    backgroundColor: "#071323",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  backIcon: {
    color: "#ffffff",
    fontSize: 38,
    fontWeight: "300",
    lineHeight: 40,
    marginTop: -3,
  },

  headerTitle: {
    flex: 1,
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
    marginLeft: 4,
  },

  saveButton: {
    width: 60,
    height: 36,
    backgroundColor: "#4CAF50",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  saveButtonDisabled: {
    backgroundColor: "#666",
    opacity: 0.5,
  },

  saveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },

  webviewContainer: {
    flex: 1,
    backgroundColor: "#1d2333",
  },

  webview: {
    flex: 1,
    backgroundColor: "#1d2333",
  },
});