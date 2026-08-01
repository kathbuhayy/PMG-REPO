import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.printhub.customer",
  appName: "PrintHub Customer",
  webDir: "build",

  // Remove server.url - let Capacitor serve the app locally
  // API calls will naturally route through the network to 10.0.2.2:3000
  // Frontend uses 10.0.2.2:3000 via REACT_APP_API_URL in .env files

  // iOS and Android specific configuration
  ios: {
    contentInset: "automatic",
  },
  android: {
    targetSdkVersion: 34,
    minSdkVersion: 22,
  },

  // Enable auto plugin initialization
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
