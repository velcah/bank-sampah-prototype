# Bank Sampah Prototype - APK Build Guide

## Option 1: Using Capacitor (Requires Node.js)

If you want to build locally:

### Prerequisites
- Install Node.js (LTS version): https://nodejs.org/
- Install Android Studio: https://developer.android.com/studio

### Steps
```bash
# 1. Install Capacitor globally
npm install -g @capacitor/cli @capacitor/core

# 2. Initialize Capacitor in your project
npx cap init "Bank Sampah" "com.banksampah.prototype" --web-dir=.

# 3. Add Android platform
npm install @capacitor/android
npx cap add android

# 4. Build the web app (if needed)
# Your files are already ready

# 5. Copy web assets to native project
npx cap sync android

# 6. Open in Android Studio
npx cap open android

# 7. Build APK (Command Line Method - Alternative to Android Studio)
cd android
./gradlew assembleDebug

# The APK will be generated at:
# android/app/build/outputs/apk/debug/app-debug.apk

# OR In Android Studio:
# - Wait for Gradle sync to complete
# - Go to Build > Build Bundle(s)/APK(s) > Build APK(s)
# - After the build finishes, click "Locate" or open the folder:
#   android/app/build/outputs/apk/debug/
# - Your APK file will be named `app-debug.apk` (or `app-release.apk` if you built release mode)
```

## Option 2: Using Apache Cordova

### Prerequisites
- Install Node.js
- Install Cordova: `npm install -g cordova`

### Steps
```bash
# 1. Create Cordova project
cordova create bank-sampah-app com.banksampah.prototype "Bank Sampah"

# 2. Copy your web files to www directory
cp index.html bank-sampah-app/www/
cp app.js bank-sampah-app/www/
cp styles.css bank-sampah-app/www/

# 3. Add Android platform
cd bank-sampah-app
cordova platform add android

# 4. Build APK
cordova build android

# 5. Find APK in platforms/android/app/build/outputs/apk/debug/
```

## Option 3: Using Online APK Builders

Several free online services can convert your web app to APK:

1. **AppsGeyser**: https://appsgeyser.com/
2. **Appy Pie**: https://www.appypie.com/
3. **BuildFire**: https://buildfire.com/

## Quick Test

To test your web app before building APK:

```bash
# Start local server
python3 -m http.server 8000

# Open http://localhost:8000 in browser
# Test all functionality
```

## Notes

- Make sure your web app works perfectly in mobile browsers before building APK
- Test on different screen sizes using browser dev tools
- The APK will be a WebView wrapper around your web app
- For production, consider adding proper PWA manifest and service worker