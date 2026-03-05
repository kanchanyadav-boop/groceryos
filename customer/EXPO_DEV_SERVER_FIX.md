# Expo Dev Server Fix for Node.js 24

## Problem
Expo SDK 50 doesn't support Node.js 24. You're getting errors when trying to start the dev server.

## Solution Options

### Option 1: Downgrade Node.js (Recommended)
Install Node.js 20 LTS from https://nodejs.org/

1. Download Node.js 20.x LTS
2. Install it
3. Restart your terminal
4. Run: `node --version` (should show v20.x.x)
5. Run: `npx expo start --clear`

### Option 2: Use NVM (Node Version Manager)
Install NVM for Windows: https://github.com/coreybutler/nvm-windows

```bash
nvm install 20
nvm use 20
npx expo start --clear
```

### Option 3: Build APK Directly (Skip Dev Server)
If you just want to test on a physical device:

```bash
# Build APK for testing
npx eas build --platform android --profile preview --local

# Or use Expo's cloud build (requires EAS account)
npx eas build --platform android --profile preview
```

### Option 4: Use Expo Go App
1. Install Expo Go from Play Store on your Android phone
2. Build using older Expo CLI that works with Node 24:
   ```bash
   npm install -g expo-cli@6.3.10
   expo start --tunnel
   ```
3. Scan QR code with Expo Go app

## Current Setup
- Node.js: v24.13.0 (TOO NEW)
- Expo SDK: 50
- Required Node.js: 18.x or 20.x

## Quick Test (No Dev Server Needed)
Build the APK directly and install on your phone:

```bash
cd customer
npx eas build --platform android --profile preview
```

This will give you a download link for the APK file.
