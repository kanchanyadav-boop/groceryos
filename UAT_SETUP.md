# UAT Environment Setup

## Overview

UAT (User Acceptance Testing) environment for testing before production deployment.

**Current Setup:**
- Firebase Project: `groceryos-61a05`
- Razorpay: Test mode keys
- Environment: UAT

## Quick Setup Steps

### 1. Add GitHub Secret

Go to: https://github.com/kanchanyadav-boop/groceryos/settings/secrets/actions

Click "New repository secret":
- **Name:** `ENV_FILE_UAT`
- **Value:** (Copy from `.env.uat` file)

```
VITE_FIREBASE_API_KEY=AIzaSyBozOHzA5rRBcxX-yt1bY6fUbDVX9H3ZVY
VITE_FIREBASE_AUTH_DOMAIN=groceryos-61a05.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=groceryos-61a05
VITE_FIREBASE_STORAGE_BUCKET=groceryos-61a05.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=146621027744
VITE_FIREBASE_APP_ID=1:146621027744:web:cdf43e18455fd8ecf0c0c5
VITE_RAZORPAY_KEY_ID=rzp_test_RrTWQ4YTkNkbU5
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_KEY
VITE_ENVIRONMENT=uat
```

### 2. Trigger Deployment

```bash
git add .
git commit -m "Setup UAT environment"
git push
```

Check deployment: https://github.com/kanchanyadav-boop/groceryos/actions

### 3. Access UAT Environment

**Admin Panel:** https://groceryos-61a05.web.app

**Customer App:** Use Expo Go with UAT Firebase config

**Agent App:** Use Expo Go with UAT Firebase config

## UAT Testing Checklist

### Admin Panel
- [ ] Login with test admin account
- [ ] Add/Edit products
- [ ] Manage inventory
- [ ] View orders
- [ ] Process refunds
- [ ] Dispatch orders
- [ ] View billing reports

### Customer App
- [ ] Phone OTP login
- [ ] Browse products
- [ ] Add to cart
- [ ] Place order (COD)
- [ ] Place order (Online payment - Test mode)
- [ ] Track order
- [ ] View order history

### Agent App
- [ ] Phone OTP login
- [ ] View assigned orders
- [ ] Update location
- [ ] Mark order as delivered
- [ ] View earnings

### Payment Testing (Razorpay Test Mode)

**Test Cards:**
- Success: `4111 1111 1111 1111`
- Failure: `4000 0000 0000 0002`
- CVV: Any 3 digits
- Expiry: Any future date

**Test UPI:**
- Success: `success@razorpay`
- Failure: `failure@razorpay`

## Test Data

### Test Admin User
- Email: `admin@groceryos.com`
- Password: [Set in Firebase Console]

### Test Phone Numbers (No SMS)
Add in Firebase Console → Authentication → Phone:
- `+919999999999` → OTP: `123456`
- `+919999999998` → OTP: `123456`

### Sample Products
```json
{
  "name": "Amul Milk 1L",
  "category": "Dairy",
  "price": 68,
  "mrp": 72,
  "unit": "litre",
  "inStock": true,
  "gstRate": 5
}
```

## Monitoring UAT

### Firebase Console
- **Authentication:** https://console.firebase.google.com/project/groceryos-61a05/authentication/users
- **Firestore:** https://console.firebase.google.com/project/groceryos-61a05/firestore
- **Functions Logs:** https://console.firebase.google.com/project/groceryos-61a05/functions/logs
- **Hosting:** https://console.firebase.google.com/project/groceryos-61a05/hosting

### GitHub Actions
- **Deployments:** https://github.com/kanchanyadav-boop/groceryos/actions

### Razorpay Dashboard
- **Test Payments:** https://dashboard.razorpay.com/app/dashboard
- **Test Webhooks:** https://dashboard.razorpay.com/app/webhooks

## Common Issues

### Build Fails
- Check GitHub Actions logs
- Verify `ENV_FILE_UAT` secret is set correctly
- Ensure all dependencies are installed

### Can't Login to Admin
- Verify user exists in Firebase Authentication
- Check staff document in Firestore
- Verify role is set correctly

### Payment Fails
- Ensure using test Razorpay keys
- Check webhook URL is configured
- Verify Cloud Functions are deployed

### Mobile App Issues
- Clear Expo cache: `npx expo start -c`
- Verify Firebase config matches UAT
- Check network connectivity

## Moving to Production

When UAT testing is complete:

1. Create production Firebase project (or use same with different hosting channel)
2. Get live Razorpay keys
3. Update `.env.production` with live keys
4. Create `ENV_FILE_PROD` GitHub secret
5. Create production deployment workflow
6. Deploy to production

## Support

- Check logs in Firebase Console
- Review GitHub Actions output
- Check browser/app console for errors
- Review `firebase-debug.log` locally
