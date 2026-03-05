# GroceryOS Quick Start Guide

## 🚀 Your Setup Status

✅ Firebase Project: `groceryos-61a05`  
✅ GitHub Repository: https://github.com/kanchanyadav-boop/groceryos  
✅ Firestore Database: Created  
✅ Authentication: Enabled (Email/Password + Phone)  
✅ Razorpay Keys: Configured  
✅ CI/CD Pipeline: Active  

## 📱 Your Apps

### Admin Panel
- **URL**: https://groceryos-61a05.web.app (after deployment)
- **Tech**: React + Vite + Tailwind
- **Login**: Email/Password

### Customer App
- **Platform**: React Native (Expo)
- **Package**: `com.groceryos.customer`
- **Login**: Phone OTP

### Agent App
- **Platform**: React Native (Expo)
- **Package**: `com.groceryos.agent`
- **Login**: Phone OTP

## 🔑 Credentials

### Firebase
- Project ID: `groceryos-61a05`
- Region: (Check Firebase Console)

### Razorpay (Test Mode)
- Key ID: `rzp_test_RrTWQ4YTkNkbU5`
- Key Secret: `L4con8FCTF4BOVNvdSiKk78u`
- ⚠️ Webhook Secret: **Not set yet** - Get from Razorpay Dashboard

## 📋 Immediate Next Steps

### 1. Wait for Deployment to Complete
Check: https://github.com/kanchanyadav-boop/groceryos/actions

### 2. Set Webhook Secret
```bash
firebase functions:config:set razorpay.webhook_secret="YOUR_WEBHOOK_SECRET"
firebase deploy --only functions
```

Or run the GitHub Actions workflow: "Setup Functions Config (Run Once)"

### 3. Create First Admin User

**Via Firebase Console:**
1. Go to: https://console.firebase.google.com/project/groceryos-61a05/authentication/users
2. Click "Add User"
3. Email: `admin@groceryos.com`
4. Password: `[choose a strong password]`
5. Copy the UID

**Add to Firestore:**
1. Go to: https://console.firebase.google.com/project/groceryos-61a05/firestore
2. Click "Start collection" → Collection ID: `staff`
3. Document ID: `[paste the UID]`
4. Add fields:
   ```
   id: [UID]
   name: "Admin User"
   email: "admin@groceryos.com"
   role: "admin"
   permissions: []
   createdAt: [timestamp - click "Add field" → type: timestamp]
   ```

### 4. Test Admin Login
1. Go to: https://groceryos-61a05.web.app
2. Login with: `admin@groceryos.com` and your password
3. You should see the dashboard!

### 5. Add Test Phone Numbers (Optional)
For testing without SMS:
1. Firebase Console → Authentication → Sign-in method → Phone
2. Scroll to "Phone numbers for testing"
3. Add: `+919999999999` with code `123456`

## 🛠️ Local Development

### Admin Panel
```bash
cd admin
npm install
npm run dev
# Opens at http://localhost:5173
```

### Customer App
```bash
cd customer
npm install
npx expo start
# Scan QR code with Expo Go app
```

### Agent App
```bash
cd agent
npm install
npx expo start
```

### Firebase Emulators (Optional)
```bash
firebase emulators:start
# Runs local Firebase services
```

## 📦 Adding Sample Data

### Products
1. Go to Firestore Console
2. Create collection: `products`
3. Add a document with fields from `shared/types.ts` → `Product` interface

### Categories
1. Create collection: `categories`
2. Add documents with fields from `shared/types.ts` → `Category` interface

## 🔄 Making Changes

### Code Changes
```bash
git add .
git commit -m "Your change description"
git push
# Automatically deploys via GitHub Actions
```

### Manual Deployment
```bash
# Functions only
firebase deploy --only functions

# Hosting only
cd admin && npm run build && cd ..
firebase deploy --only hosting

# Rules only
firebase deploy --only firestore:rules,storage
```

## 🐛 Troubleshooting

### Deployment Failed?
- Check GitHub Actions logs
- Verify `FIREBASE_SERVICE_ACCOUNT` secret is set
- Check `firebase-debug.log`

### Can't Login to Admin?
- Verify user exists in Authentication
- Verify staff document exists in Firestore with correct UID
- Check browser console for errors

### Functions Not Working?
- Check Cloud Functions logs: `firebase functions:log`
- Verify Razorpay config is set: `firebase functions:config:get`

### Mobile App Issues?
- Clear Expo cache: `npx expo start -c`
- Check Firebase config in `shared/config.ts`
- Verify `google-services.json` is in app root

## 📚 Documentation

- Full deployment guide: `DEPLOYMENT.md`
- Architecture overview: `README.md`
- Firebase Console: https://console.firebase.google.com/project/groceryos-61a05
- GitHub Repository: https://github.com/kanchanyadav-boop/groceryos

## 🆘 Need Help?

1. Check GitHub Actions logs
2. Check Firebase Console logs
3. Review `firebase-debug.log`
4. Check browser/app console errors

## 🎯 Production Checklist (Before Launch)

- [ ] Switch Razorpay to live keys
- [ ] Enable Firebase App Check
- [ ] Set up custom domain for admin
- [ ] Configure Firebase budget alerts
- [ ] Enable Firestore backups
- [ ] Add error tracking (Sentry)
- [ ] Load test with 50+ concurrent users
- [ ] Review and tighten security rules
- [ ] Set up monitoring and alerts
- [ ] Build and submit mobile apps to stores
