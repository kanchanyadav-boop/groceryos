// customer/app/_layout.tsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../src/lib/firebase";
import { useAuthStore } from "../src/store";
import { COLLECTIONS } from "../src/shared/config";
import { User } from "../src/shared/types";
import * as Notifications from "expo-notifications";

// Configure how notifications are shown when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  const { setUser, clearUser } = useAuthStore();

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));
        if (userDoc.exists()) {
          const profile = { id: firebaseUser.uid, ...userDoc.data() } as User;
          setUser(profile, firebaseUser.uid);
        }
      } else {
        clearUser();
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor="#060A12" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#060A12" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/onboarding" />
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="product/[id]" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="cart" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="order-tracking/[orderId]" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="address/index" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="order-success" options={{ animation: "fade" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
