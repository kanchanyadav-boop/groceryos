// customer/src/lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FIREBASE_CONFIG } from "../shared/config";

// Prevent re-initialization in Expo hot reload
const app = getApps().length === 0
  ? initializeApp(FIREBASE_CONFIG)
  : getApps()[0];

// initializeAuth throws if called twice on the same app (e.g. Expo hot reload).
// Fall back to getAuth() when Auth was already initialized for this app.
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
})();

export const db = getFirestore(app);
export const storage = getStorage(app);
// Shared functions instance — uses the same app so auth token is auto-attached
export const functions = getFunctions(app);
export default app;

// ─── ensureAuth ──────────────────────────────────────────────────────────────
// Waits for Firebase Auth to restore the persisted custom-token session from
// AsyncStorage. With custom-token auth the session is permanent — it only
// needs one wait per app launch. Throws if no session exists so the caller
// can redirect the user to the login screen.
// ─────────────────────────────────────────────────────────────────────────────
let _authReady: Promise<FirebaseUser | null> | null = null;

function waitForAuthReady(): Promise<FirebaseUser | null> {
  if (!_authReady) {
    _authReady = new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        unsub();
        resolve(user);
      });
    });
  }
  return _authReady;
}

export async function ensureAuth(): Promise<FirebaseUser> {
  // Fast path — already restored
  if (auth.currentUser) return auth.currentUser;

  // Wait for AsyncStorage persistence to finish loading (first call only)
  const restored = await waitForAuthReady();
  if (restored) return restored;

  // No session — user must log in
  throw new Error("NO_SESSION");
}
