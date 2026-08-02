import React, { useState, useEffect } from "react";
import { StyleSheet, View, ActivityIndicator, Alert } from "react-native";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WEB_APP_URL } from "../config";
import { COLORS } from "../theme";

export default function CustomizerWebViewScreen({ route, navigation }) {
  const { product, selectedOptions } = route.params || {};
  const productId = product?.id;
  const [loading, setLoading] = useState(true);
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
  const queryParts = ["customizer=true", "embed=true"];
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
        ${
          userJson
            ? `localStorage.setItem("user", JSON.stringify(${userJson}));`
            : `localStorage.setItem("user", ` +
              `JSON.stringify({ role: "guest" }));`
        }
      } catch (e) {}
    })();
    true;
  `;

  // Post-load JS: inject CSS to hide web header, nav, and footers
  const injectedPostLoadJS = `
    (function() {
      const injectStyles = () => {
        if (!document.head) return;
        const style = document.createElement('style');
        style.id = 'mobile-hide-web-chrome';
        style.innerHTML = \`
          header, nav, .navbar, .po-top, .app-header, footer,
          .pd-customizer-page-header, .po-back-btn, .po-breadcrumb,
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
          body, #root, .pd-page, .po-page {
            padding-top: 0 !important;
            margin-top: 0 !important;
            background-color: #07111f !important;
          }
        \`;
        if (!document.getElementById('mobile-hide-web-chrome')) {
          document.head.appendChild(style);
        }
      };
      injectStyles();
      setTimeout(injectStyles, 500);
      setTimeout(injectStyles, 1500);
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
                navigation.navigate("ProductDetail", {
                  product,
                  completedDesign: data.design,
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
      <WebView
        source={{ uri: targetUrl }}
        injectedJavaScriptBeforeContentLoaded={injectedPreLoadJS}
        injectedJavaScript={injectedPostLoadJS}
        onMessage={HandleWebViewMessage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={["*"]}
        mixedContentMode="always"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        startInLoadingState={true}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn("[WebViewError] {LoadUrl}: ", nativeEvent);
        }}
      />
      {loading && (
        <ActivityIndicator
          size="large"
          color={COLORS.accentCyan}
          style={styles.loader}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  webview: {
    flex: 1,
  },
  loader: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -20,
  },
});
