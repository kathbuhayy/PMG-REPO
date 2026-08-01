# PrintHub Customer App - Testing Guide

## ✅ Sync Completed

Web assets have been copied to: `android/app/src/main/assets/public`

---

## Testing on Android Emulator

### Prerequisites

- **Android Studio** installed ([download](https://developer.android.com/studio))
- **Android SDK** (API 22+)
- **Java Development Kit (JDK)** 11+ installed

### Step 1: Open Android Project in Android Studio

```bash
# Option A: From terminal
cd android
# Then open with Android Studio

# Option B: Direct command (if Android Studio is in PATH)
start android
```

Or manually:

1. Open **Android Studio**
2. Click **File > Open**
3. Navigate to: `PrintHub_FrontEnd/android`
4. Click **Open**

### Step 2: Create/Select Android Virtual Device (AVD)

1. In Android Studio, click **Tools > Device Manager**
2. Click **Create Device**
3. Select a device (e.g., **Pixel 6 Pro**)
4. Choose API level **31+** (e.g., Android 12, 13, 14)
5. Name it (e.g., "Pixel6_API31")
6. Click **Finish**

### Step 3: Run App on Emulator

**Option A: Using Android Studio UI**

1. Select the emulator from the dropdown (top toolbar)
2. Click **Run Button** (green play icon) or press `Shift+F10`
3. Select **app** module
4. Wait for app to launch (~30-60 seconds first time)

**Option B: Using Command Line**

```bash
cd android
bash gradlew installDebug
# Then start emulator from Device Manager and app launches automatically
```

### Testing Checklist

- [ ] App launches without crashing
- [ ] Login screen displays correctly
- [ ] Can navigate to Products page
- [ ] Add item to cart and view cart
- [ ] Navigate to checkout
- [ ] Profile/Account settings load
- [ ] No console errors in Android Studio logcat

---

## Testing on Physical Android Device

### Prerequisites

- Android phone (Android 5.1+)
- USB cable
- USB debugging enabled on phone

### Setup Steps

**1. Enable Developer Mode on Phone**

- Go to **Settings > About Phone**
- Tap **Build Number** 7 times
- Go back to **Settings > Developer Options**
- Enable **USB Debugging**
- Connect phone via USB

**2. Run on Device from Android Studio**

1. Connect phone via USB
2. In Android Studio, select your device from the dropdown (instead of emulator)
3. Click **Run** (green play icon)
4. App installs and launches on physical phone

**3. Via Command Line**

```bash
cd android
bash gradlew installDebug
```

Then manually launch "PrintHub Customer" app from phone.

### Testing Checklist

- [ ] App launches without crashing
- [ ] Responsive touch interactions
- [ ] Network requests hit correct backend API
- [ ] Screenshots look good on real screen size
- [ ] Camera/file permissions work (if used)

---

## Testing on Network

### If Backend is Running Locally

**On Emulator**: Use `10.0.2.2` instead of `localhost`

```typescript
// capacitor.config.ts
server: {
  url: 'http://10.0.2.2:3000',  // Emulator special IP for host
}
```

**On Physical Device**: Use your computer's local IP

```bash
# Find your computer's IP
ipconfig  # Windows - look for IPv4 Address

# Then update capacitor.config.ts
server: {
  url: 'http://YOUR_COMPUTER_IP:3000',
}
```

Then rebuild and sync: `npm run build && npx cap sync`

### Production API Testing

```typescript
// capacitor.config.ts
server: {
  url: 'https://api.printhub.com',  // Your production domain
}
```

---

## Debugging

### View Console Logs

1. Connect phone/emulator via USB
2. In Android Studio: **View > Tool Windows > Logcat**
3. Filter by app name: type `printhub` in search

### View Network Requests

1. Install **Android Studio Network Profiler**
2. Run app with profiler: **Run > Profile**
3. Click **Network** tab
4. Test API calls and view requests/responses

### Common Issues

**"Could not connect to backend"**

- Check if backend is running
- Verify correct API URL in capacitor.config.ts
- Use 10.0.2.2 for emulator, not localhost

**"App crashes on startup"**

- Check Logcat for error message
- Verify build folder exists and is not empty
- Run: `npm run build && npx cap sync`

**"Blank white screen"**

- Wait 5-10 seconds (first load is slow)
- Check Network tab - verify API calls succeed
- Check Logcat for JavaScript errors

---

## After Testing

### Rebuilding After Code Changes

```bash
# If you change React code:
npm run build          # Rebuild React app
npx cap sync           # Copy to Android
# Then click Run in Android Studio
```

### Testing on iOS (macOS Only)

```bash
# On macOS with Xcode installed:
npm install @capacitor/ios
npx cap add ios
npx cap open ios       # Opens Xcode project
# Then click Run in Xcode
```

---

## Next Steps

- **Phase 5**: Sign app and prepare for Play Store
- **Optimize**: Bundle size, performance, offline support
- **Add Features**: Push notifications, camera access, file downloads
