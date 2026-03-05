// customer/src/lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FIREBASE_CONFIG } from "../shared/config";

// Prevent re-initialization in Expo hot reload
const app = getApps().length === 0
  ? initializeApp(FIREBASE_CONFIG)
  : getApps()[0];

// Use AsyncStorage persistence for React Native
export const auth = getApps().length <= 1
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  : getAuth(app);

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
