# 🔒 Security Setup - URGENT

## ⚠️ API Key Exposed on GitHub

Your Firebase API key is public on GitHub. While this is normal for Firebase apps, you MUST restrict it to prevent abuse.

## Immediate Actions Required

### 1. Restrict API Key in Google Cloud Console

**Go to:** https://console.cloud.google.com/apis/credentials?project=groceryos-61a05

**Find your API key:** `AIzaSyBozOHzA5rRBcxX-yt1bY6fUbDVX9H3ZVY`

**Click on the key name to edit it, then:**

#### A. Set Application Restrictions

**For Web (Admin Panel):**
- Select: "HTTP referrers (web sites)"
- Add these referrers:
  ```
  https://groceryos-61a05.web.app/*
  https://groceryos-61a05.firebaseapp.com/*
  http://localhost:5173/*
  http://localhost:*
  ```

**For Android Apps:**
- You'll need separate API keys for mobile apps
- Select: "Android apps"
- Add package names:
  - `com.groceryos.customer`
  - `com.groceryos.agent`
- Add SHA-1 fingerprints (get from Expo/Play Console)

#### B. Set API Restrictions

Restrict to only these APIs:
- ✅ Cloud Firestore API
- ✅ Firebase Authentication API
- ✅ Firebase Storage API
- ✅ Identity Toolkit API
- ✅ Token Service API
- ✅ Firebase Installations API
- ✅ Firebase Cloud Messaging API

**Uncheck all other APIs**

### 2. Create Separate API Keys for Mobile Apps

**Create new API key for Customer App:**
1. Click "Create Credentials" → "API Key"
2. Name: "GroceryOS Customer App"
3. Application restrictions: "Android apps"
4. Package name: `com.groceryos.customer`
5. Add SHA-1 certificate fingerprint
6. API restrictions: Same as above

**Create new API key for Agent App:**
1. Click "Create Credentials" → "API Key"
2. Name: "GroceryOS Agent App"
3. Application restrictions: "Android apps"
4. Package name: `com.groceryos.agent`
5. Add SHA-1 certificate fingerprint
6. API restrictions: Same as above

### 3. Enable Firebase App Check

**Go to:** https://console.firebase.google.com/project/groceryos-61a05/appcheck

**For Web (Admin):**
1. Click "Register" under Web apps
2. Select "reCAPTCHA v3"
3. Get site key from: https://www.google.com/recaptcha/admin
4. Add to your admin app

**For Android Apps:**
1. Register each app
2. Use "Play Integrity" for production
3. Use "Debug" provider for development

### 4. Rotate the Exposed API Key (If Needed)

If you see suspicious usage:
1. Create a new API key
2. Update `shared/config.ts`
3. Delete the old key
4. Redeploy all apps

### 5. Set Up Budget Alerts

**Go to:** https://console.cloud.google.com/billing/budgets?project=groceryos-61a05

1. Create budget alert
2. Set amount: $10/month (adjust as needed)
3. Add email notifications at 50%, 90%, 100%

### 6. Monitor API Usage

**Go to:** https://console.cloud.google.com/apis/dashboard?project=groceryos-61a05

Check daily for:
- Unusual traffic spikes
- Requests from unexpected locations
- High error rates

## Additional Security Measures

### Update Firestore Rules (Already Done ✅)
Your rules are already role-based and secure.

### Secure Cloud Functions
Add rate limiting (TODO):
```javascript
// In functions/src/index.ts
// Add rate limiting middleware
```

### Environment Variables for Sensitive Data

Never commit these to Git:
- ❌ Razorpay Key Secret
- ❌ Webhook Secrets
- ❌ Service Account Keys
- ✅ Firebase API Key (OK to be public, but restrict it)

### Enable 2FA for Firebase Console

1. Go to: https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Use authenticator app (not SMS)

## Verification Checklist

After completing the above:

- [ ] API key restricted to specific domains/apps
- [ ] API key restricted to specific APIs only
- [ ] Separate API keys created for mobile apps
- [ ] Firebase App Check enabled
- [ ] Budget alerts configured
- [ ] 2FA enabled on Google account
- [ ] Monitoring dashboard bookmarked
- [ ] Team members educated on security practices

## What's Safe to Commit to Git?

✅ **Safe:**
- Firebase API Key (if properly restricted)
- Firebase Project ID
- Firebase Auth Domain
- App IDs
- Public configuration

❌ **Never Commit:**
- Service Account JSON files
- Private keys
- Razorpay Key Secret
- Webhook secrets
- Database passwords
- OAuth client secrets

## Emergency Response

If you detect abuse:

1. **Immediately disable the API key:**
   - Go to Cloud Console → Credentials
   - Click the key → Disable

2. **Create new API key:**
   - Generate new key with restrictions
   - Update apps and redeploy

3. **Review logs:**
   - Check Firebase Console → Usage
   - Check Cloud Console → Logs Explorer

4. **Contact support:**
   - Firebase Support: https://firebase.google.com/support
   - Report abuse: abuse@firebase.google.com

## Regular Security Audits

**Monthly:**
- [ ] Review API usage patterns
- [ ] Check for unauthorized users in Authentication
- [ ] Review Firestore security rules
- [ ] Check Cloud Functions logs for errors
- [ ] Verify budget alerts are working

**Quarterly:**
- [ ] Rotate service account keys
- [ ] Update dependencies (npm audit fix)
- [ ] Review team member access
- [ ] Test disaster recovery procedures

## Resources

- Firebase Security Rules: https://firebase.google.com/docs/rules
- App Check: https://firebase.google.com/docs/app-check
- API Key Best Practices: https://cloud.google.com/docs/authentication/api-keys
- Security Checklist: https://firebase.google.com/support/guides/security-checklist
