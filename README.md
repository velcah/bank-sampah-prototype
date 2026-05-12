# Bank Sampah Sadang Serang Prototype

A mobile-first waste bank administration prototype built as a local web app.

## Features
- Login / role selection
- Dashboard with daily summaries
- Fast transaction entry with automatic total calculation
- Customer search and list
- Transaction history with filters
- Waste category price management
- Customer balance overview
- Reports and recap
- Local persistence using browser storage

## Run locally
1. Open `index.html` in a browser.
2. Or use a local server from the project folder:
   - `python3 -m http.server 8000`
   - Open `http://localhost:8000`

## Build APK (Android App)

See `APK_BUILD_GUIDE.md` for detailed instructions on creating an Android APK file.

### Quick APK Build (Using PWABuilder - No Installation Required)
1. Go to https://www.pwabuilder.com/
2. Enter your local URL: `http://localhost:8000` (run local server first)
3. Click "Start" and wait for analysis
4. Click "Build" under Android
5. Download the APK file

The app is now PWA-ready with manifest.json for better mobile experience.

## Notes
- Data is stored in browser `localStorage`.
- Settings include reset to clear data and start fresh.
