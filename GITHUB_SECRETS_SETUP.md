# GitHub Secrets Setup for UAT

## Single Secret Approach (Recommended)

Go to: https://github.com/kanchanyadav-boop/groceryos/settings/secrets/actions

### Required Secrets

#### 1. ENV_FILE_UAT (UAT Environment Variables)

Click "New repository secret":
- **Name:** `ENV_FILE_UAT`
- **Value:** Copy the entire content from `.env.uat` file:

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

#### 2. FIREBASE_SERVICE_ACCOUNT (Already Added ✅)

This is already configured for Firebase deployment.

## Why Single Secret?

✅ **Simpler**: Only 1 secret to manage instead of 8  
✅ **Easier to update**: Edit one secret instead of many  
✅ **Environment parity**: Same format as local `.env` files  
✅ **Less error-prone**: Copy-paste entire file content  

## For Production (Later)

When ready for production, create:
- **Name:** `ENV_FILE_PROD`
- **Value:** Content from `.env.production` with live Razorpay keys

## Why Use GitHub Secrets?

✅ **Security**: Credentials not exposed in public repository  
✅ **Flexibility**: Easy to update without code changes  
✅ **Best Practice**: Industry standard for CI/CD  
✅ **Audit Trail**: GitHub logs who accesses secrets  

## Local Development

For local development, create `.env` files:

### Admin Panel (.env in admin/ folder)
```bash
cd admin
cp ../.env.example .env
# Edit .env with your values
```

### Customer App (.env in customer/ folder)
```bash
cd customer
cp ../.env.example .env
# Edit .env with your values
```

### Agent App (.env in agent/ folder)
```bash
cd agent
cp ../.env.example .env
# Edit .env with your values
```

## Verification

After adding all secrets:

1. Go to: https://github.com/kanchanyadav-boop/groceryos/actions
2. Click "Re-run all jobs" on the latest workflow
3. Check if build succeeds

## Security Notes

- ⚠️ Never commit `.env` files to Git (already in .gitignore)
- ⚠️ Rotate keys if accidentally exposed
- ⚠️ Use different keys for production vs development
- ✅ GitHub Secrets are encrypted and only exposed during workflow runs
