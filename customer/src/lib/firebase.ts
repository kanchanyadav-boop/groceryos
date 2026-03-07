// customer/src/lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
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

