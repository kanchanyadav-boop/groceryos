# GroceryOS Deployment Guide

## Prerequisites

- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Git & GitHub account
- Firebase project: `groceryos-61a05`

## Local Development Setup

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd groceryos
```

### 2. Install Dependencies
```bash
# Functions
cd functions && npm install && cd ..

# Admin Panel
cd admin && npm install && cd ..

# Customer App
cd customer && npm install && cd ..

# Agent App
cd agent && npm install && cd ..
```

### 3. Firebase Login
```bash
firebase login
firebase use groceryos-61a05
```

### 4. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your keys (if using env vars).

For Cloud Functions, set config:
```bash
firebase functions:config:set \
  razorpay.key_id="rzp_test_YOUR_KEY" \
  razorpay.key_secret="YOUR_SECRET" \
  razorpay.webhook_secret="YOUR_WEBHOOK_SECRET"
```

### 5. Run Locally with Emulators
```bash
firebase emulators:start
```

Then in separate terminals:
```bash
# Admin Panel
cd admin && npm run dev

# Customer App
cd customer && npx expo start

# Agent App
cd agent && npx expo start
```

## Manual Deployment

### Deploy Everything
```bash
# Build functions
cd functions && npm run build && cd ..

# Build admin panel
cd admin && npm run build && cd ..

# Deploy to Firebase
firebase deploy
```

### Deploy Specific Services

**Firestore Rules & Indexes:**
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

**Storage Rules:**
```bash
firebase deploy --only storage
```

**Cloud Functions:**
```bash
cd functions && npm run build && cd ..
firebase deploy --only functions
```

**Admin Hosting:**
```bash
cd admin && npm run build && cd ..
firebase deploy --only hosting
```

## GitHub Actions CI/CD Setup

### 1. Generate Firebase Token
```bash
firebase login:ci
```
Copy the token that's generated.

### 2. Add GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:
- `FIREBASE_TOKEN`: Paste the token from step 1
- `FIREBASE_SERVICE_ACCOUNT`: Get from Firebase Console → Project Settings → Service Accounts → Generate new private key

### 3. Push to GitHub
```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 4. Automatic Deployment

Now every push to `main` branch will automatically:
- Build Cloud Functions
- Build Admin Panel
- Deploy to Firebase Hosting
- Deploy Firestore Rules & Indexes
- Deploy Cloud Functions

## Mobile App Deployment (Expo EAS)

### Customer App
```bash
cd customer
npx eas build --platform android
npx eas submit --platform android
```

### Agent App
```bash
cd agent
npx eas build --platform android
npx eas submit --platform android
```

## Production Checklist

- [ ] Update Razorpay keys to live mode
- [ ] Enable Firebase App Check
- [ ] Set up Firebase budget alerts
- [ ] Configure custom domain for admin panel
- [ ] Enable Firestore daily backups
- [ ] Set up error tracking (Sentry)
- [ ] Load test with 50+ concurrent orders
- [ ] Review and tighten Firestore security rules
- [ ] Add rate limiting to Cloud Functions
- [ ] Set up monitoring and alerts

## Rollback Procedure

### Rollback Functions
```bash
firebase functions:log
firebase deploy --only functions
```

### Rollback Hosting
```bash
firebase hosting:channel:deploy preview
# Test, then:
firebase hosting:clone SOURCE_SITE_ID:SOURCE_CHANNEL_ID TARGET_SITE_ID:live
```

## Monitoring

- **Firebase Console**: https://console.firebase.google.com/project/groceryos-61a05
- **Cloud Functions Logs**: `firebase functions:log`
- **Firestore Usage**: Firebase Console → Firestore Database → Usage
- **Hosting Analytics**: Firebase Console → Hosting

## Support

For issues, check:
1. `firebase-debug.log`
2. Cloud Functions logs: `firebase functions:log`
3. GitHub Actions logs in your repository
