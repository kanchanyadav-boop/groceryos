# GroceryOS — Production Platform

Three apps. One Firebase backend. Zero DevOps overhead at MVP.

## Platform Overview

| App | Stack | Users |
|-----|-------|-------|
| Customer App | React Native (Expo) | End customers |
| Admin Web Panel | Vite + React + Tailwind | Staff (admin, inventory, dispatch, billing) |
| Delivery Agent App | React Native (Expo) | Delivery riders |

**Backend:** Firebase Auth · Firestore · Cloud Functions · FCM · Storage  
**Payments:** Razorpay (UPI, Card, Wallet, COD)  
**Maps:** Google Maps Platform

---

## Project Structure

```
groceryos/
├── shared/
│   ├── types.ts              # All TypeScript types
│   └── config.ts             # Firebase, Razorpay, Maps config
├── admin/                    # Vite + React admin web panel
│   ├── src/pages/            # Dashboard, SKU, Inventory, Orders, Dispatch, Refunds, Billing
│   ├── src/contexts/         # AuthContext with RBAC
│   ├── src/lib/firebase.ts
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
├── customer/                 # Expo customer app
│   ├── app/                  # expo-router routes
│   │   ├── (auth)/           # login, onboarding
│   │   ├── (tabs)/           # home, orders, profile
│   │   ├── cart.tsx
│   │   ├── order-tracking/[orderId].tsx
│   │   └── order-success.tsx
│   ├── src/screens/          # OTPAuth, ProductCatalog, CartCheckout, OrderTracking
│   ├── src/store/            # Zustand (cart + auth, AsyncStorage backed)
│   └── src/lib/firebase.ts
├── agent/                    # Expo agent app
│   ├── app/
│   │   ├── (auth)/login.tsx
│   │   ├── home.tsx          # AgentHome with GPS broadcast
│   │   ├── delivery/[orderId].tsx  # OTP proof of delivery
│   │   └── earnings.tsx
│   └── src/screens/          # AgentHome, DeliveryScreen
├── functions/                # Firebase Cloud Functions
│   ├── src/index.ts          # 8 Cloud Functions
│   ├── package.json
│   └── tsconfig.json
├── firestore.rules           # Role-based security rules
├── firestore.indexes.json    # Composite indexes
├── storage.rules
└── firebase.json             # Hosting + Functions deploy config
```

---

## Quick Setup

### 1. Firebase Project

1. Create project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable: Authentication (Phone + Email/Password), Firestore, Storage, Functions (Blaze plan)
3. Copy Firebase config from **Project Settings → Your Apps → Web App**

### 2. Fill in config

Edit `shared/config.ts`:
```ts
export const FIREBASE_CONFIG = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
export const RAZORPAY_KEY_ID = "rzp_test_XXXX";
export const GOOGLE_MAPS_API_KEY = "YOUR_MAPS_KEY";
```

### 3. Deploy Firestore Rules + Indexes

```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 4. Deploy Cloud Functions

```bash
firebase functions:config:set \
  razorpay.key_id="rzp_test_XXXX" \
  razorpay.key_secret="YOUR_SECRET" \
  razorpay.webhook_secret="YOUR_WEBHOOK_SECRET"

cd functions && npm install && npm run build
firebase deploy --only functions
```

### 5. Admin Panel

```bash
cd admin && npm install
npm run dev         # localhost:5173
npm run build && firebase deploy --only hosting  # production
```

**Create first admin user:**
1. Firebase Console → Authentication → Add User (email/password)
2. Create Firestore document: `staff/{uid}` with `role: "admin"`

### 6. Customer App

```bash
cd customer && npm install
npx expo start --android   # or --ios
```

Add test phone numbers in Firebase Console → Auth → Phone → Test numbers.

### 7. Agent App

```bash
cd agent && npm install
npx expo start --android
```

Create Firestore document: `agents/{uid}` with `status: "offline"`.

---

## Staff Roles & Permissions

| Role | SKU | Inventory | Orders | Dispatch | Refunds | Billing |
|------|-----|-----------|--------|----------|---------|---------|
| admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| inventory_manager | ✓ | ✓ | ✓ | — | — | — |
| dispatcher | — | — | ✓ | ✓ | — | — |
| billing | — | — | ✓ | — | ✓ | ✓ |
| support | — | — | ✓ | — | — | — |

---

## Cloud Functions

| Function | Trigger | What it does |
|----------|---------|-------------|
| `placeOrder` | HTTPS Callable | Inventory reservation + Razorpay order creation |
| `verifyPayment` | HTTPS Callable | HMAC signature verification |
| `razorpayWebhook` | HTTPS Request | Payment captured / refund processed events |
| `onRefundApproved` | Firestore trigger | Auto-calls Razorpay refund API |
| `onOrderStatusChange` | Firestore trigger | FCM notifications + inventory decrement |
| `onInventoryUpdate` | Firestore trigger | Low-stock alert FCM to admin |
| `autoAssignAgent` | HTTPS Callable | Nearest agent geo-assignment |
| `setStaffRole` | HTTPS Callable | Firebase custom claims (RBAC) |

---

## CSV Bulk Import Format

```csv
name,category,subcategory,price,mrp,unit,brand,gstRate,barcode,description,tags,quantity
Amul Milk 1L,Dairy,Milk,68,72,litre,Amul,5,8901063039019,Fresh milk,dairy|fresh,50
Tata Salt 1kg,Pantry,Salt,22,24,kg,Tata,5,8901426000013,Iodized salt,salt|pantry,200
```

---

## Cost at MVP (0–100 users)

| Service | Monthly Cost |
|---------|-------------|
| Firebase Spark | ₹0 |
| Google Maps | ₹0 (free credit) |
| Razorpay | 2% per transaction |
| MSG91 OTP SMS | ~₹50 |
| Resend email | ₹0 |
| **Total** | **~₹500–1,000/mo** |

---

## Production Checklist

- [ ] Replace Razorpay test keys with live keys
- [ ] Enable Firebase App Check
- [ ] Set Firebase budget alerts
- [ ] Configure custom domain for admin
- [ ] Submit apps to Play Store / App Store via Expo EAS
- [ ] Set up Sentry error tracking
- [ ] Enable Firestore daily backups
- [ ] Load test: 50+ concurrent orders
