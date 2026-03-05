// customer/app/index.tsx
// Root redirect — send to tabs if logged in, login if not
import { Redirect } from "expo-router";
import { useAuthStore } from "../src/store";
import { View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";

export default function Index() {
  const { isLoggedIn, user } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Small delay to let Zustand hydrate from AsyncStorage
    const timer = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: "#060A12", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#10B981" />
      </View>
    );
  }

  if (isLoggedIn && user) {
    if (!user.name) return <Redirect href="/(auth)/onboarding" />;
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
}
