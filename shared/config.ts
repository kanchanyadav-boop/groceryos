// shared/config.ts
// ─── Firebase Configuration ─────────────────────────────────────────────────
// Values are hardcoded for UAT. For production, update via .env.production

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBozOHzA5rRBcxX-yt1bY6fUbDVX9H3ZVY",
  authDomain: "groceryos-61a05.firebaseapp.com",
  projectId: "groceryos-61a05",
  storageBucket: "groceryos-61a05.firebasestorage.app",
  messagingSenderId: "146621027744",
  appId: "1:146621027744:web:cdf43e18455fd8ecf0c0c5",
};

// ─── Razorpay ───────────────────────────────────────────────────────────────
export const RAZORPAY_KEY_ID = "rzp_test_RrTWQ4YTkNkbU5";
// NEVER put RAZORPAY_KEY_SECRET in frontend code — only in Cloud Functions env

// ─── Google Maps ────────────────────────────────────────────────────────────
export const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_KEY";

// ─── App Config ─────────────────────────────────────────────────────────────
export const APP_CONFIG = {
  appName: "GroceryOS",
  deliveryFee: 30,        // ₹30 flat delivery fee
  freeDeliveryAbove: 500, // free delivery above ₹500
  currency: "INR",
  currencySymbol: "₹",
  supportPhone: "+91-9999999999",
  supportEmail: "support@groceryos.com",
  maxCartItems: 50,
  deliverySlots: {
    AM: { label: "Morning (9am – 1pm)", cutoffHour: 7 },
    PM: { label: "Evening (2pm – 7pm)", cutoffHour: 12 },
  },
};

// ─── Firestore Collection Names ─────────────────────────────────────────────
export const COLLECTIONS = {
  PRODUCTS: "products",
  INVENTORY: "inventory",
  ORDERS: "orders",
  USERS: "users",
  AGENTS: "agents",
  PAYMENTS: "payments",
  REFUNDS: "refunds",
  STAFF: "staff",
  STORES: "stores",
  CATEGORIES: "categories",
  DELIVERY_SLOTS: "deliverySlots",
  CHATS: "chats",
  NOTIFICATIONS: "notifications",
  INVENTORY_LOGS: "inventoryLogs",
  SETTINGS: "settings",
  VENDORS: "vendors",
  PURCHASE_ORDERS: "purchaseOrders",
};
