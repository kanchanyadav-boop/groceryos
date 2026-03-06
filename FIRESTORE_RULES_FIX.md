# Firestore Rules Fix - Permission Denied Error

## Problem
Customer app getting "Missing or insufficient permissions" error when trying to:
1. Create user accounts during OTP login
2. Read products in the catalog

## Root Cause
Firestore security rules are too restrictive for the demo/UAT mode. The rules require authentication, but we're creating users without Firebase Auth.

## Solution Applied

### Code Changes
1. **OTP Auth** (`customer/src/screens/Auth/OTPAuth.tsx`)
   - Changed from querying users by phone to using phone as document ID
   - Avoids query permission issues
   - Uses `getDoc()` instead of `getDocs(query())`

2. **Firestore Rules** (`firestore.rules`)
   - Opened `users` collection for demo mode:
     ```javascript
     match /users/{userId} {
       allow read: if true;
       allow create: if true;
       allow update, delete: if true;
     }
     ```

### Deployment Status
Rules have been committed to GitHub and should deploy via GitHub Actions workflow.

**Check deployment status:**
https://github.com/kanchanyadav-boop/groceryos/actions

## How to Verify

1. Wait for GitHub Actions to show green checkmark (✅)
2. Close and reopen the customer app
3. Try logging in with any phone number + OTP: 123456

## If Still Not Working

The rules might not have deployed yet. You can manually deploy from Firebase Console:

1. Go to: https://console.firebase.google.com/project/groceryos-61a05/firestore/rules
2. Copy the rules from `firestore.rules` file
3. Paste and click "Publish"

## For Production

These rules are intentionally open for demo purposes. For production:
- Re-enable authentication checks
- Use proper Firebase Phone Auth
- Restrict user collection access to authenticated users only
