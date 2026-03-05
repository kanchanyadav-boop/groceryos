# 🚀 Next Steps - GroceryOS UAT Setup

## ✅ Completed

- [x] Firebase project created (`groceryos-61a05`)
- [x] Firestore database enabled
- [x] Authentication enabled (Email/Password + Phone)
- [x] GitHub repository created
- [x] CI/CD pipeline configured
- [x] Environment variables moved to GitHub Secrets
- [x] `ENV_FILE_UAT` secret added
- [x] Deployment triggered

## 🔄 In Progress

### 1. Monitor Deployment (5-10 minutes)

**Check deployment status:**
https://github.com/kanchanyadav-boop/groceryos/actions

**What's being deployed:**
- ✅ Cloud Functions (8 functions)
- ✅ Firestore Rules & Indexes
- ✅ Storage Rules
- ✅ Admin Panel (React app)

**Wait for:** Green checkmark ✅ on all steps

---

## 📋 Immediate Actions (After Deployment Completes)

### 2. Secure Your API Key (5 minutes) ⚠️ IMPORTANT

**Go to:** https://console.cloud.google.com/apis/credentials?project=groceryos-61a05

1. Find API key: `AIzaSyBozOHzA5rRBcxX-yt1bY6fUbDVX9H3ZVY`
2. Click to edit
3. **Application restrictions:**
   - Select: "HTTP referrers (web sites)"
   - Add:
     ```
     https://groceryos-61a05.web.app/*
     https://groceryos-61a05.firebaseapp.com/*
     http://localhost:*/*
     ```
4. **API restrictions:**
   - Select: "Restrict key"
   - Enable only:
     - Cloud Firestore API
     - Firebase Authentication API
     - Firebase Storage API
     - Identity Toolkit API
     - Token Service API
     - Firebase Installations API
5. Click "Save"

### 3. Set Razorpay Webhook Secret (3 minutes)

**Option A: Via GitHub Actions (Recommended)**

1. Go to: https://github.com/kanchanyadav-boop/groceryos/actions
2. Click "Setup Functions Config (Run Once)" workflow
3. Click "Run workflow" → Select "main" → Run
4. This will set your Razorpay keys in Cloud Functions

**Option B: Manual (if you can login to Firebase CLI)**

```bash
firebase functions:config:set \
  razorpay.key_id="rzp_test_RrTWQ4YTkNkbU5" \
  razorpay.key_secret="L4con8FCTF4BOVNvdSiKk78u" \
  razorpay.webhook_secret="YOUR_WEBHOOK_SECRET"

firebase deploy --only functions
```

**Get Webhook Secret from Razorpay:**
1. Go to: https://dashboard.razorpay.com/app/webhooks
2. Create webhook: `https://us-central1-groceryos-61a05.cloudfunctions.net/razorpayWebhook`
3. Copy the webhook secret
4. Update the config above

### 4. Create First Admin User (5 minutes)

**Step 1: Create Firebase Auth User**

Go to: https://console.firebase.google.com/project/groceryos-61a05/authentication/users

1. Click "Add User"
2. Email: `admin@groceryos.com`
3. Password: `[choose a strong password - save it!]`
4. Click "Add User"
5. **Copy the UID** (looks like: `abc123xyz456...`)

**Step 2: Create Firestore Staff Document**

Go to: https://console.firebase.google.com/project/groceryos-61a05/firestore/data

1. Click "Start collection"
2. Collection ID: `staff`
3. Document ID: `[paste the UID from step 1]`
4. Add fields:
   - `id` (string): `[paste the UID]`
   - `name` (string): `Admin User`
   - `email` (string): `admin@groceryos.com`
   - `role` (string): `admin`
   - `permissions` (array): `[]` (empty array)
   - `createdAt` (timestamp): Click "Add field" → Select "timestamp" → Use current time
5. Click "Save"

### 5. Test Admin Login (2 minutes)

1. Go to: https://groceryos-61a05.web.app
2. Login with:
   - Email: `admin@groceryos.com`
   - Password: `[your password from step 4]`
3. You should see the dashboard! 🎉

---

## 🧪 UAT Testing (30-60 minutes)

### 6. Add Test Data

**Add Sample Products:**

Go to Firestore: https://console.firebase.google.com/project/groceryos-61a05/firestore/data

Create collection: `products`

Add a document:
```json
{
  "id": "milk-amul-1l",
  "name": "Amul Milk 1L",
  "slug": "amul-milk-1l",
  "category": "Dairy",
  "subcategory": "Milk",
  "price": 68,
  "mrp": 72,
  "unit": "litre",
  "imageUrls": ["https://via.placeholder.com/300"],
  "description": "Fresh full cream milk",
  "brand": "Amul",
  "inStock": true,
  "tags": ["dairy", "milk", "fresh"],
  "gstRate": 5,
  "weight": 1000,
  "createdAt": [timestamp],
  "updatedAt": [timestamp]
}
```

**Add Inventory:**

Create collection: `inventory`

Add document with ID: `milk-amul-1l`
```json
{
  "skuId": "milk-amul-1l",
  "quantity": 100,
  "reserved": 0,
  "available": 100,
  "lowStockThreshold": 10,
  "updatedBy": "system",
  "updatedAt": [timestamp]
}
```

**Add Categories:**

Create collection: `categories`

Add a document:
```json
{
  "id": "dairy",
  "name": "Dairy",
  "slug": "dairy",
  "imageUrl": "https://via.placeholder.com/300",
  "subcategories": [
    {"id": "milk", "name": "Milk", "slug": "milk"}
  ],
  "sortOrder": 1
}
```

### 7. Test Admin Panel Features

- [ ] View products in SKU Management
- [ ] Edit product details
- [ ] Update inventory
- [ ] View dashboard (should show 0 orders initially)

### 8. Add Test Phone Numbers (Optional)

For testing without SMS:

Go to: https://console.firebase.google.com/project/groceryos-61a05/authentication/settings

1. Click "Sign-in method" tab
2. Click "Phone" provider
3. Scroll to "Phone numbers for testing"
4. Add:
   - Phone: `+919999999999` → Code: `123456`
   - Phone: `+919999999998` → Code: `123456`
5. Save

---

## 📱 Mobile Apps Setup (Later)

### 9. Customer App

```bash
cd customer
npm install
npx expo start
```

Scan QR code with Expo Go app

### 10. Agent App

```bash
cd agent
npm install
npx expo start
```

Scan QR code with Expo Go app

---

## 🔍 Monitoring & Verification

### Check Deployment Status
- GitHub Actions: https://github.com/kanchanyadav-boop/groceryos/actions
- Firebase Console: https://console.firebase.google.com/project/groceryos-61a05

### Check Logs
- Functions Logs: https://console.firebase.google.com/project/groceryos-61a05/functions/logs
- Firestore Usage: https://console.firebase.google.com/project/groceryos-61a05/firestore/usage

### Test URLs
- Admin Panel: https://groceryos-61a05.web.app
- Functions: https://us-central1-groceryos-61a05.cloudfunctions.net

---

## 📚 Documentation Reference

- **Quick Start:** `QUICK_START.md`
- **UAT Setup:** `UAT_SETUP.md`
- **Security:** `SECURITY_SETUP.md`
- **Deployment:** `DEPLOYMENT.md`
- **GitHub Secrets:** `GITHUB_SECRETS_SETUP.md`

---

## ⚠️ Troubleshooting

### Deployment Failed?
- Check GitHub Actions logs
- Verify `ENV_FILE_UAT` secret is correct
- Check `FIREBASE_SERVICE_ACCOUNT` secret

### Can't Login?
- Verify user exists in Authentication
- Check staff document in Firestore
- Verify UID matches in both places

### Functions Not Working?
- Check Cloud Functions logs
- Verify Razorpay config is set
- Check webhook URL in Razorpay dashboard

---

## 🎯 Success Criteria

You'll know UAT is ready when:

- ✅ Admin panel loads at https://groceryos-61a05.web.app
- ✅ You can login with admin credentials
- ✅ Dashboard shows products and inventory
- ✅ No errors in browser console
- ✅ Cloud Functions are deployed (check Firebase Console)
- ✅ Firestore rules are active

---

## 🚀 After UAT Testing

Once everything works in UAT:

1. Gather feedback from team
2. Fix any issues
3. Prepare production environment
4. Get live Razorpay keys
5. Deploy to production

---

**Current Status:** Deployment in progress...

Check: https://github.com/kanchanyadav-boop/groceryos/actions
