# Fix Service Account Permissions

## Problem
The Firebase service account doesn't have permission to deploy Firestore rules, indexes, or storage.

## Solution: Grant Required Roles

### Step 1: Go to IAM Console
https://console.cloud.google.com/iam-admin/iam?project=groceryos-61a05

### Step 2: Find Your Service Account
Look for: `firebase-adminsdk-XXXXX@groceryos-61a05.iam.gserviceaccount.com`

### Step 3: Edit Permissions
Click the pencil icon (Edit) next to the service account

### Step 4: Add These Roles
Click "Add Another Role" and add each of these:

1. **Firebase Rules Admin**
   - Allows deploying Firestore and Storage rules

2. **Cloud Datastore Index Admin**
   - Allows deploying Firestore indexes

3. **Service Usage Admin**
   - Allows enabling required APIs

4. **Cloud Functions Admin** (if not already present)
   - Allows deploying Cloud Functions

5. **Firebase Hosting Admin** (if not already present)
   - Allows deploying to Firebase Hosting

### Step 5: Save
Click "Save" at the bottom

### Step 6: Re-run Deployment
Once permissions are granted, trigger a new deployment:

```bash
git commit --allow-empty -m "Trigger deployment after fixing permissions"
git push
```

## Alternative: Deploy Manually (One-time)

If you want to deploy rules manually for now:

```bash
firebase login
firebase use groceryos-61a05
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## Verify Permissions

After adding roles, verify the service account has:
- ✅ Firebase Rules Admin
- ✅ Cloud Datastore Index Admin  
- ✅ Service Usage Admin
- ✅ Cloud Functions Admin
- ✅ Firebase Hosting Admin
- ✅ Editor (or Owner)

## Quick Fix for Now

I'll update the workflow to skip rules deployment temporarily. You can deploy rules manually once, then re-enable in the workflow after fixing permissions.
