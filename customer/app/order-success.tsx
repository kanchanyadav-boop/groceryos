// customer/app/order-success.tsx
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

export default function OrderSuccess() {
  const { orderId, total, itemCount } = useLocalSearchParams<{
    orderId: string;
    total: string;
    itemCount: string;
  }>();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>Order Placed!</Text>
      <Text style={styles.subtitle}>
        Your order #{orderId?.slice(-6).toUpperCase()} has been placed successfully.{"\n"}
        We'll notify you once it's packed and dispatched.
      </Text>

      {/* Order summary pill */}
      {(itemCount || total) ? (
        <View style={styles.summaryPill}>
          {itemCount ? <Text style={styles.summaryText}>{itemCount} items</Text> : null}
          {itemCount && total ? <Text style={styles.summaryDivider}>·</Text> : null}
          {total ? <Text style={styles.summaryTotal}>₹{total}</Text> : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        {orderId && (
          <TouchableOpacity
            style={styles.trackBtn}
            onPress={() => router.replace(`/order-tracking/${orderId}`)}
          >
            <Text style={styles.trackBtnText}>Track My Order</Text>
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
  container: { flex: 1, backgroundColor: "#0F1117", alignItems: "center", justifyContent: "center", padding: 32 },
  emoji: { fontSize: 72, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "900", color: "#fff", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#8A8A9A", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  summaryPill: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#16181F", borderRadius: 24, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: "#262830", marginBottom: 36 },
  summaryText: { color: "#7A7A8E", fontSize: 14, fontWeight: "600" },
  summaryDivider: { color: "#4E4E60", fontSize: 14 },
  summaryTotal: { color: "#2ECC71", fontSize: 16, fontWeight: "900" },
  actions: { width: "100%", gap: 12 },
  trackBtn: { backgroundColor: "#2ECC71", borderRadius: 16, paddingVertical: 18, alignItems: "center" },
  trackBtnText: { color: "#000", fontWeight: "900", fontSize: 16 },
  homeBtn: { borderWidth: 1, borderColor: "#262830", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  homeBtnText: { color: "#7A7A8E", fontWeight: "700", fontSize: 15 },
});
