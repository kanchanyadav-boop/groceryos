// customer/src/lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence, signInAnonymously, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
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
// Guarantees we have a valid Firebase Auth user before calling Cloud Functions.
// Handles three cases:
//   1. User already signed in  →  returns immediately
//   2. Persistence is restoring (async)  →  waits for it to finish
//   3. No session found  →  signs in anonymously (silent, invisible to user)
//
// Usage:  const user = await ensureAuth();
//         await user.getIdToken(true);   // fresh token for CF call
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
  // 1. Fast path — already signed in
  if (auth.currentUser) {
    return auth.currentUser;
  }

  // 2. Wait for persistence to restore (only blocks once, then cached)
  const restored = await waitForAuthReady();
  if (restored) {
    return restored;
  }

  // 3. No session at all — sign in anonymously (creates a real Firebase user)
  const cred = await signInAnonymously(auth);
  return cred.user;
}
