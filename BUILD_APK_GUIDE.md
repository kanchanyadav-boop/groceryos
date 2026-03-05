# 📦 Build APK for Green's Supermarket Customer App

## Prerequisites

- Node.js installed
- Expo account (free) - create at https://expo.dev/signup

## Step-by-Step Instructions

### 1. Install EAS CLI (One-time)

```bash
npm install -g eas-cli
```

### 2. Login to Expo (One-time)

```bash
eas login
```

Enter your Expo account credentials (or create account at https://expo.dev/signup)

### 3. Navigate to Customer App

```bash
cd customer
```

### 4. Configure EAS Build (One-time)

```bash
eas build:configure
```

This will:
- Create `eas.json` configuration file (already created)
- Link your project to Expo

When prompted:
- "Would you like to automatically create an EAS project?" → **Yes**

### 5. Build APK

```bash
eas build --platform android --profile preview
```

This will:
- Upload your code to Expo servers
- Build the APK in the cloud
- Take approximately 15-20 minutes

**What happens during build:**
- ✅ Code is bundled
- ✅ Dependencies are installed
- ✅ Android APK is compiled
- ✅ APK is signed

### 6. Download APK

Once build completes, you'll see:
```
✔ Build finished
https://expo.dev/accounts/[your-account]/projects/greens-supermarket-customer/builds/[build-id]
```

**Two ways to download:**

**Option A: Direct Download**
- Click the link in terminal
- Click "Download" button
- APK will download to your computer

**Option B: QR Code**
- Open the link on your phone's browser
- Scan QR code shown
- APK will download directly to phone

### 7. Install on Phone

**Method 1: Direct Install (if downloaded on phone)**
1. Open the downloaded APK file
2. Android will ask "Install unknown apps?"
3. Allow installation from browser/file manager
4. Tap "Install"
5. Tap "Open" when done

**Method 2: Transfer from Computer**
1. Connect phone to computer via USB
2. Copy APK to phone's Downloads folder
3. On phone, open File Manager
4. Navigate to Downloads
5. Tap the APK file
6. Allow installation from File Manager
7. Tap "Install"

### 8. Launch App

1. Find "Green's Supermarket" in your app drawer
2. Open the app
3. Grant location permission when asked
4. Login with test number: +919999999999
5. OTP: 123456

## Troubleshooting

### "eas: command not found"
```bash
npm install -g eas-cli
# Restart terminal
```

### "Not logged in"
```bash
eas login
```

### "Build failed"
- Check build logs in the Expo dashboard
- Common issues:
  - Missing dependencies → Run `npm install` in customer folder
  - Invalid configuration → Check `app.json` and `eas.json`

### "Can't install APK on phone"
- Enable "Install unknown apps" in Android settings
- Settings → Apps → Special access → Install unknown apps
- Enable for your browser or file manager

### "App crashes on launch"
- Check if Firebase configuration is correct in `shared/config.ts`
- Ensure all dependencies are installed

## Build Profiles

We have 3 build profiles in `eas.json`:

1. **preview** (Current) - APK for testing
   - Fast to build
   - Easy to install
   - Good for UAT

2. **development** - Development build
   - Includes dev tools
   - Hot reload support

3. **production** - App Bundle for Play Store
   - Optimized size
   - Ready for store submission

## Next Steps After Testing

1. Test all features on phone
2. Fix any issues found
3. Build production version: `eas build --platform android --profile production`
4. Submit to Google Play Store

## Useful Commands

```bash
# Check build status
eas build:list

# View build details
eas build:view [build-id]

# Cancel ongoing build
eas build:cancel

# Build for both platforms
eas build --platform all --profile preview
```

## Cost

- Expo EAS Build is **FREE** for:
  - Unlimited builds for open source projects
  - Limited builds for free accounts (check current limits)
  
- For unlimited builds, upgrade to Expo paid plan

## Support

- Expo Documentation: https://docs.expo.dev/build/introduction/
- EAS Build: https://docs.expo.dev/build/setup/
- Troubleshooting: https://docs.expo.dev/build-reference/troubleshooting/
