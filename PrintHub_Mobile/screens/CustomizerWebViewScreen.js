import React, { useState, useEffect } from "react";
import { StyleSheet, View, ActivityIndicator, Alert, Pressable, Text } from "react-native";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { WEB_APP_URL, API_BASE_URL } from "../config";
import { COLORS } from "../theme";

export default function CustomizerWebViewScreen({ route, navigation }) {
  const { product, selectedOptions } = route.params || {};
  const productId = product?.id;
  const [userJson, setUserJson] = useState(null);

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

  // Build target URL with selected options as query params
  const queryParts = [
    "customizer=true",
    "embed=true",
    `apiUrl=${encodeURIComponent(API_BASE_URL)}`
  ];
  if (selectedOptions) {
    if (selectedOptions.size) {
      queryParts.push(`size=${encodeURIComponent(selectedOptions.size)}`);
    }
    if (selectedOptions.material) {
      queryParts.push(
        `material=${encodeURIComponent(selectedOptions.material)}`
      );
    }
    if (selectedOptions.side) {
      queryParts.push(`side=${encodeURIComponent(selectedOptions.side)}`);
    }
    if (selectedOptions.finishing) {
      queryParts.push(
        `finishing=${encodeURIComponent(selectedOptions.finishing)}`
      );
    }
    if (selectedOptions.color) {
      queryParts.push(`color=${encodeURIComponent(selectedOptions.color)}`);
    }
  }

  const targetUrl = `${WEB_APP_URL}/product/${productId}?${queryParts.join(
    "&"
  )}`;

  // Pre-load JS: set localStorage session before React initializes
  const injectedPreLoadJS = `
    (function() {
      try {
        sessionStorage.setItem("pmg_splash_seen", "true");
        ${userJson
      ? `localStorage.setItem("user", JSON.stringify(${userJson}));`
      : `localStorage.setItem("user", ` +
      `JSON.stringify({ role: "guest" }));`
    }
      } catch (e) {}
    })();
    true;
  `;

  // Post-load JS: turn the web customizer into a focused mobile workspace.
  // The 3D renderer remains the primary view; tool panels open over it instead
  // of pushing it below a long, scrollable page.
  const injectedPostLoadJS = `
    (function() {
      const injectStyles = () => {
        if (!document.head) return;
        const style = document.createElement('style');
        style.id = 'mobile-hide-web-chrome';
        style.innerHTML = \`
          header, nav, .navbar, .po-top, .app-header, footer,
          .pd-customizer-header-left, .po-back-btn, .po-breadcrumb,
          .po-right-col, .po-left-col,
          button.login-btn, div.user-nav-actions, .mobile-navbar,
          .mobile-bottom-nav, .user-home-header, .phc-fab, .phc-window,
          .chatbot-container, .chatbot-toggle-btn, .ph-chatbot-fab,
          .chatbot-wrapper, #printhub-chatbot-root, .printhub-chatbot-btn {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            min-height: 0 !important;
          }
          html, body, #root, .pd-page, .po-page, .pd-customizer-page-wrapper {
            padding: 0 !important;
            margin: 0 !important;
            background-color: #ffffff !important;
            height: 100vh !important;
            min-height: 100vh !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .tsc-root {
            flex: 1 !important;
            max-height: none !important;
            height: 100% !important;
            padding-bottom: 0 !important;
            background-color: #ffffff !important;
          }
          @media (max-width: 991px) {
            html, body, #root, .pd-page, .po-page, .pd-customizer-page-wrapper {
              overflow: hidden !important;
              overscroll-behavior: none !important;
            }
            .tsc-root {
              position: fixed !important;
              inset: 0 !important;
              display: block !important;
              overflow: hidden !important;
              background: #0d1b2e !important;
              z-index: 1 !important;
            }
            .tsc-3col-layout, .tsc-4col-layout {
              display: block !important;
              position: absolute !important;
              inset: 0 !important;
              width: 100% !important;
              height: 100% !important;
              min-height: 0 !important;
              padding: 0 !important;
              margin: 0 !important;
              overflow: hidden !important;
            }
            .tsc-right-preview {
              display: block !important;
              position: absolute !important;
              inset: 0 !important;
              width: 100% !important;
              max-width: none !important;
              height: 100% !important;
              background: #0d1b2e !important;
              border-radius: 0 !important;
              z-index: 1 !important;
            }
            .tsc-right-preview .tsc-preview-panel,
            .tsc-preview-panel {
              display: block !important;
              width: 100% !important;
              height: 100% !important;
              padding: 0 !important;
              overflow: hidden !important;
            }
            .tsc-right-preview .tsc-preview-3d,
            .tsc-preview-3d {
              width: 100% !important;
              height: 100% !important;
              max-height: none !important;
              border: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              background: #0d1b2e !important;
            }
            .tsc-center-placeholders {
              display: none !important;
            }
            .tsc-vertical-tabs {
              display: flex !important;
              flex-direction: column !important;
              align-items: stretch !important;
              position: fixed !important;
              top: 102px !important;
              right: 0 !important;
              z-index: 30 !important;
              width: 66px !important;
              padding: 8px 5px !important;
              gap: 5px !important;
              border: 0 !important;
              border-radius: 16px 0 0 16px !important;
              background: rgba(35, 51, 72, 0.94) !important;
              box-shadow: -8px 10px 28px rgba(0, 0, 0, 0.22) !important;
              max-height: calc(100vh - 120px) !important;
              overflow-y: auto !important;
              scrollbar-width: none !important;
            }
            .tsc-vertical-tabs::-webkit-scrollbar { display: none !important; }
            .tsc-vtab-btn {
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              min-width: 0 !important;
              min-height: 54px !important;
              padding: 7px 2px !important;
              gap: 3px !important;
              color: #d7e0eb !important;
              font-size: 9px !important;
              line-height: 1.1 !important;
              white-space: normal !important;
            }
            .tsc-vtab-btn.active {
              color: #ffffff !important;
              background: rgba(255,255,255,0.14) !important;
            }
            .tsc-vtab-icon { font-size: 17px !important; }
            .tsc-sidebar {
              position: fixed !important;
              top: 78px !important;
              right: 76px !important;
              bottom: 86px !important;
              z-index: 25 !important;
              width: min(310px, calc(100vw - 96px)) !important;
              height: auto !important;
              padding: 14px !important;
              overflow-y: auto !important;
              border-radius: 16px !important;
              background: #ffffff !important;
              box-shadow: 0 16px 42px rgba(0,0,0,0.34) !important;
              transform: translateX(calc(100% + 92px)) !important;
              opacity: 0 !important;
              pointer-events: none !important;
              transition: transform .22s ease, opacity .22s ease !important;
            }
            .tsc-root.ph-mobile-panel-open .tsc-sidebar {
              transform: translateX(0) !important;
              opacity: 1 !important;
              pointer-events: auto !important;
            }
            .tsc-bottom-action-bar {
              position: fixed !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              z-index: 35 !important;
              width: auto !important;
              margin: 0 !important;
              padding: 12px 18px calc(12px + env(safe-area-inset-bottom)) !important;
              background: rgba(255,255,255,0.98) !important;
              box-shadow: 0 -6px 22px rgba(0,0,0,0.15) !important;
            }
            .tsc-use-btn {
              min-height: 48px !important;
              border-radius: 12px !important;
              background: #14733b !important;
            }
            .tsc-active-design-bar,
            .tsc-header-fallback,
            .tsc-use-btn-header { display: none !important; }
          }
        \`;
        if (!document.getElementById('mobile-hide-web-chrome')) {
          document.head.appendChild(style);
        }
      };
      injectStyles();
      setTimeout(injectStyles, 500);
      setTimeout(injectStyles, 1500);

      const setUpMobileToolPanel = () => {
        const root = document.querySelector('.tsc-root');
        if (!root || root.dataset.phMobileToolsBound) return;
        root.dataset.phMobileToolsBound = 'true';
        document.querySelectorAll('.tsc-vtab-btn').forEach((button) => {
          button.addEventListener('click', () => {
            root.classList.add('ph-mobile-panel-open');
          });
        });
        document.querySelector('.tsc-right-preview')?.addEventListener('click', () => {
          root.classList.remove('ph-mobile-panel-open');
        });
      };
      setUpMobileToolPanel();
      new MutationObserver(setUpMobileToolPanel).observe(document.body, { childList: true, subtree: true });
    })();
    true;
  `;

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

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back to product details"
          hitSlop={10}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textLight} />
        </Pressable>
        <Text style={styles.toolbarTitle} numberOfLines={1}>3D Customizer</Text>
      </View>
      <WebView
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
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn("[WebViewError] {LoadUrl}: ", nativeEvent);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  toolbar: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: COLORS.primaryDark,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  backButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  toolbarTitle: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: "800",
  },
  webview: {
    flex: 1,
  },
});
