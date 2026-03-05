// agent/app/_layout.tsx
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { onAuthStateChanged } from "firebase/auth";
import { router } from "expo-router";
import { auth } from "../src/lib/firebase";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!authChecked) {
        setAuthChecked(true);
        if (!user) router.replace("/(auth)/login");
        else router.replace("/home");
      }
    });
    return () => unsub();
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
        <Stack.Screen name="home" />
        <Stack.Screen name="delivery/[orderId]" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="earnings" />
      </Stack>
    </GestureHandlerRootView>
  );
}
