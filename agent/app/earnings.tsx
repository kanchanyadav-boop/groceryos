// agent/app/earnings.tsx
import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db, auth } from "../src/lib/firebase";
import { COLLECTIONS } from "../../shared/config";
import { Order } from "../../shared/types";
import { format, startOfWeek, startOfMonth } from "date-fns";
import { router } from "expo-router";

export default function Earnings() {
  const agentId = auth.currentUser?.uid;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month">("week");

  useEffect(() => {
    const load = async () => {
      if (!agentId) return;
      setLoading(true);
      const q = query(
        collection(db, COLLECTIONS.ORDERS),
        where("agentId", "==", agentId),
        where("status", "==", "delivered"),
        orderBy("createdAt", "desc"),
        limit(100)
      );
      const snap = await getDocs(q);
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      setLoading(false);
    };
    load();
  }, [agentId]);

  const getFilteredOrders = () => {
    const now = new Date();
    return orders.filter(o => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt);
      if (period === "today") return d.toDateString() === now.toDateString();
      if (period === "week") return d >= startOfWeek(now);
      return d >= startOfMonth(now);
    });
  };

  const filtered = getFilteredOrders();
  // ₹30 per delivery (simplified, replace with actual earnings model)
  const EARNING_PER_DELIVERY = 30;
  const total = filtered.length * EARNING_PER_DELIVERY;
  const codOrders = filtered.filter(o => o.paymentMethod === "cod");
  const codTotal = codOrders.reduce((a, o) => a + (o.totalAmount || 0), 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Earnings</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {(["today", "week", "month"] as const).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderColor: "#10B98140" }]}>
          <Text style={styles.statValue}>₹{total}</Text>
          <Text style={styles.statLabel}>Earnings</Text>
        </View>
        <View style={[styles.statCard, { borderColor: "#3B82F640" }]}>
          <Text style={[styles.statValue, { color: "#3B82F6" }]}>{filtered.length}</Text>
          <Text style={styles.statLabel}>Deliveries</Text>
        </View>
        <View style={[styles.statCard, { borderColor: "#F59E0B40" }]}>
          <Text style={[styles.statValue, { color: "#F59E0B" }]}>₹{codTotal}</Text>
          <Text style={styles.statLabel}>COD Collected</Text>
        </View>
      </View>

      {/* Delivery List */}
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>{filtered.length} Deliveries</Text>
        {loading ? (
          <ActivityIndicator color="#10B981" style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <Text style={styles.emptyText}>No deliveries in this period</Text>
        ) : (
          filtered.map(order => (
            <View key={order.id} style={styles.deliveryRow}>
              <View style={styles.deliveryLeft}>
                <Text style={styles.deliveryId}>#{order.id.slice(-6).toUpperCase()}</Text>
                <Text style={styles.deliveryTime}>
                  {order.createdAt ? format(new Date(order.createdAt), "dd MMM, hh:mm a") : "—"}
                </Text>
              </View>
              <View style={styles.deliveryRight}>
                <Text style={styles.deliveryEarning}>+₹{EARNING_PER_DELIVERY}</Text>
                {order.paymentMethod === "cod" && (
                  <Text style={styles.codLabel}>COD: ₹{order.totalAmount}</Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060A12" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  back: { color: "#fff", fontSize: 22, width: 32 },
  title: { color: "#fff", fontWeight: "900", fontSize: 20 },
  periodRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 20 },
  periodBtn: { flex: 1, paddingVertical: 9, backgroundColor: "#111827", borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#1F2937" },
  periodBtnActive: { backgroundColor: "#10B98120", borderColor: "#10B981" },
  periodText: { color: "#6B7280", fontSize: 12, fontWeight: "600" },
  periodTextActive: { color: "#10B981" },
  statsGrid: { flexDirection: "row", gap: 12, paddingHorizontal: 20, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: "#0C1220", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1 },
  statValue: { color: "#10B981", fontWeight: "900", fontSize: 20 },
  statLabel: { color: "#6B7280", fontSize: 11, marginTop: 4 },
  listSection: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: { color: "#9CA3AF", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  emptyText: { color: "#4B5563", fontSize: 14, textAlign: "center", marginTop: 40 },
  deliveryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1C2A3E" },
  deliveryLeft: {},
  deliveryId: { color: "#10B981", fontWeight: "700", fontSize: 13, fontFamily: "monospace" },
  deliveryTime: { color: "#6B7280", fontSize: 11, marginTop: 3 },
  deliveryRight: { alignItems: "flex-end" },
  deliveryEarning: { color: "#fff", fontWeight: "900", fontSize: 16 },
  codLabel: { color: "#F59E0B", fontSize: 11, marginTop: 2 },
});
