// shared/config.ts
// ─── Firebase Configuration ─────────────────────────────────────────────────
// These values are loaded from environment variables in production
// For local development, create a .env file (see .env.example)

export const FIREBASE_CONFIG = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "AIzaSyBozOHzA5rRBcxX-yt1bY6fUbDVX9H3ZVY",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || "groceryos-61a05.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "groceryos-61a05",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || "groceryos-61a05.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "146621027744",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || "1:146621027744:web:cdf43e18455fd8ecf0c0c5",
};

// ─── Razorpay ───────────────────────────────────────────────────────────────
export const RAZORPAY_KEY_ID = import.meta.env?.VITE_RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "rzp_test_RrTWQ4YTkNkbU5";
// NEVER put RAZORPAY_KEY_SECRET in frontend code — only in Cloud Functions env

// ─── Google Maps ────────────────────────────────────────────────────────────
export const GOOGLE_MAPS_API_KEY = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_KEY";

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
  CATEGORIES: "categories",
  DELIVERY_SLOTS: "deliverySlots",
  CHATS: "chats",
  NOTIFICATIONS: "notifications",
  INVENTORY_LOGS: "inventoryLogs",
};
