# GitHub Secrets Setup

## Required GitHub Secrets

Go to: https://github.com/kanchanyadav-boop/groceryos/settings/secrets/actions

Click "New repository secret" for each of the following:

### Firebase Configuration

1. **FIREBASE_API_KEY**
   - Value: `AIzaSyBozOHzA5rRBcxX-yt1bY6fUbDVX9H3ZVY`

2. **FIREBASE_AUTH_DOMAIN**
   - Value: `groceryos-61a05.firebaseapp.com`

3. **FIREBASE_PROJECT_ID**
   - Value: `groceryos-61a05`

4. **FIREBASE_STORAGE_BUCKET**
   - Value: `groceryos-61a05.firebasestorage.app`

5. **FIREBASE_MESSAGING_SENDER_ID**
   - Value: `146621027744`

6. **FIREBASE_APP_ID**
   - Value: `1:146621027744:web:cdf43e18455fd8ecf0c0c5`

### Razorpay

7. **RAZORPAY_KEY_ID**
   - Value: `rzp_test_RrTWQ4YTkNkbU5`

### Google Maps

8. **GOOGLE_MAPS_API_KEY**
   - Value: `YOUR_GOOGLE_MAPS_KEY` (update when you get it)

### Firebase Service Account (Already Added ✅)

9. **FIREBASE_SERVICE_ACCOUNT**
   - Already configured

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
