// customer/app/(tabs)/orders.tsx
import { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { collection, query, where, orderBy, onSnapshot, limit, Timestamp } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { useAuthStore } from "../../src/store";
import { COLLECTIONS } from "../../src/shared/config";
import { Order, OrderStatus } from "../../src/shared/types";
import { router } from "expo-router";
import { format } from "date-fns";
import { useAppStore } from "../../src/store";

const STATUS_CONFIG: Record<OrderStatus, { color: string; emoji: string }> = {
  confirmed:  { color: "#3B82F6", emoji: "✅" },
  packed:     { color: "#F59E0B", emoji: "📦" },
  dispatched: { color: "#8B5CF6", emoji: "🛵" },
  delivered:  { color: "#2ECC71", emoji: "🎉" },
  cancelled:  { color: "#E05252", emoji: "❌" },
  refunded:   { color: "#8A8A9A", emoji: "💰" },
};

export default function OrdersTab() {
  const { firebaseUid } = useAuthStore();
  const { setActiveOrderCount } = useAppStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUid) return;
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where("userId", "==", firebaseUid),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      setOrders(all);
      setLoading(false);
      const active = all.filter(o => ["confirmed", "packed", "dispatched"].includes(o.status)).length;
      setActiveOrderCount(active);
    });
    return () => unsub();
  }, [firebaseUid]);

  const renderOrder = ({ item: order }: { item: Order }) => {
    const cfg = STATUS_CONFIG[order.status];
    const isActive = ["confirmed", "packed", "dispatched"].includes(order.status);

    return (
      <TouchableOpacity
        style={[styles.orderCard, isActive && { borderColor: cfg.color + "40" }]}
        onPress={() => router.push(`/order-tracking/${order.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Order #{order.id.slice(-6).toUpperCase()}</Text>
            <Text style={styles.orderDate}>
              {order.createdAt
                ? format(
                    order.createdAt instanceof Timestamp
                      ? order.createdAt.toDate()
                      : new Date(order.createdAt),
                    "dd MMM yyyy, hh:mm a"
                  )
                : "—"}
            </Text>
          </View>
          <Text style={styles.orderAmount}>₹{order.totalAmount}</Text>
        </View>

        <Text style={styles.itemsSummary} numberOfLines={1}>
          {order.items?.map(i => i.name).join(", ")}
        </Text>

        <View style={styles.orderFooter}>
          <View style={[styles.statusPill, { backgroundColor: cfg.color + "20", borderColor: cfg.color + "40" }]}>
            <Text style={{ fontSize: 12 }}>{cfg.emoji}</Text>
            <Text style={[styles.statusText, { color: cfg.color }]}>{order.status}</Text>
          </View>
          {isActive && (
            <Text style={styles.trackLink}>Track →</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#2ECC71" style={{ marginTop: 60 }} />
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.push("/(tabs)/home")}>
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: "900", color: "#fff" },
  list: { padding: 16, paddingBottom: 40 },
  orderCard: {
    backgroundColor: "#16181F", borderRadius: 18, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: "#262830",
  },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  orderId: { color: "#2ECC71", fontWeight: "700", fontSize: 14, fontFamily: "monospace" },
  orderDate: { color: "#8A8A9A", fontSize: 11, marginTop: 2 },
  orderAmount: { color: "#fff", fontWeight: "900", fontSize: 18 },
  itemsSummary: { color: "#8A8A9A", fontSize: 12, marginBottom: 12 },
  orderFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  trackLink: { color: "#2ECC71", fontSize: 13, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { color: "#8A8A9A", fontSize: 16, marginBottom: 24 },
  shopBtn: { backgroundColor: "#2ECC71", borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  shopBtnText: { color: "#000", fontWeight: "900", fontSize: 15 },
});
