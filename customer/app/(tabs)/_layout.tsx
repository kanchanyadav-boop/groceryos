// customer/app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore, useCartStore } from "../../src/store";

function TabIcon({
  name,
  focused,
  badge,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  focused: boolean;
  badge?: number;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={22} color={focused ? "#2ECC71" : "#4E4E60"} />
      {badge && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  const { activeOrderCount } = useAppStore();
  const cartCount = useCartStore(s => s.getItemCount());

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#16181F",
          borderTopColor: "#262830",
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#2ECC71",
        tabBarInactiveTintColor: "#4E4E60",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "home" : "home-outline"} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reorder"
        options={{
          title: "Reorder",
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "refresh-circle" : "refresh-circle-outline"} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: "Categories",
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "grid" : "grid-outline"} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "receipt" : "receipt-outline"}
              focused={focused}
              badge={activeOrderCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "cart" : "cart-outline"}
              focused={focused}
              badge={cartCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    position: "relative",
  },
  iconWrapActive: { backgroundColor: "#2ECC7115" },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#E05252",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
});
