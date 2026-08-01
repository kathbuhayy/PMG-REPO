# PrintHub Mobile Setup Guide

This guide covers the necessary steps for new developers to configure and run the PrintHub Mobile App on their local environments.

## 1. Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- Android Studio (for Android Emulator) or Xcode (for iOS Simulator)
- Expo CLI (optional but recommended: `npm install -g expo-cli`)

## 2. Environment Configuration
For Expo to expose environment variables to the frontend code, they **MUST** be prefixed with `EXPO_PUBLIC_`. 

1. Duplicate `.env.example` and rename it to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure your network addresses:
   - **For Android Studio Emulator:** Use `10.0.2.2`. This is the special alias to your host loopback interface. 
     ```env
     EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
     EXPO_PUBLIC_WEB_APP_URL=http://10.0.2.2:3001
     ```
   - **For iOS Simulator:** Use `localhost` or `127.0.0.1`.
     ```env
     EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3000
     EXPO_PUBLIC_WEB_APP_URL=http://127.0.0.1:3001
     ```
   - **For Physical Devices:** You must use your machine's local IPv4 address (e.g., `http://192.168.1.5:3000`), and both the computer and mobile device must be connected to the exact same Wi-Fi network.

## 3. Installation
Navigate to the mobile directory and install dependencies:
```bash
cd PrintHub_Mobile
npm install
```

## 4. Running the Application
Start the Expo development server:
```bash
npm start
```
From the Expo menu, you can press:
- `a` to open in Android Studio Emulator
- `i` to open in iOS Simulator
- Or scan the QR code using the Expo Go app on a physical device.

## Troubleshooting
- **Network Errors (Axios/Fetch):** If you get a "Network Error", it means the mobile app cannot reach the backend. Double check that you are using `10.0.2.2` for Android and NOT `localhost`. Also verify that the backend is actually running.
- **Variables Not Found:** If `process.env.EXPO_PUBLIC_API_BASE_URL` returns undefined, verify that your variable name starts with `EXPO_PUBLIC_` and that you've restarted the Expo bundler (using `npm start -c` to clear the cache).
