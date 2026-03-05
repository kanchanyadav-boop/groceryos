// customer/app/order-success.tsx
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

export default function OrderSuccess() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>Order Placed!</Text>
      <Text style={styles.subtitle}>
        Your order #{orderId?.slice(-6).toUpperCase()} has been placed successfully.{"\n"}
        We'll notify you as it's prepared and dispatched.
      </Text>

      <View style={styles.actions}>
        {orderId && (
          <TouchableOpacity
            style={styles.trackBtn}
            onPress={() => router.replace(`/order-tracking/${orderId}`)}
          >
            <Text style={styles.trackBtnText}>📍 Track My Order</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace("/(tabs)/home")}
        >
          <Text style={styles.homeBtnText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060A12", alignItems: "center", justifyContent: "center", padding: 32 },
  emoji: { fontSize: 80, marginBottom: 20 },
  title: { fontSize: 30, fontWeight: "900", color: "#fff", marginBottom: 12, textAlign: "center" },
  subtitle: { fontSize: 15, color: "#6B7280", textAlign: "center", lineHeight: 22, marginBottom: 40 },
  actions: { width: "100%", gap: 12 },
  trackBtn: { backgroundColor: "#10B981", borderRadius: 16, paddingVertical: 18, alignItems: "center" },
  trackBtnText: { color: "#000", fontWeight: "900", fontSize: 16 },
  homeBtn: { borderWidth: 1, borderColor: "#1C2A3E", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  homeBtnText: { color: "#9CA3AF", fontWeight: "700", fontSize: 15 },
});
