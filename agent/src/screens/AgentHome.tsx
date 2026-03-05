// agent/src/screens/AgentHome.tsx
import { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, Switch, ActivityIndicator,
} from "react-native";
import {
  collection, query, where, onSnapshot, doc, updateDoc,
  serverTimestamp, orderBy, limit,
} from "firebase/firestore";
import * as Location from "expo-location";
import { db } from "../lib/firebase";
import { getAuth } from "firebase/auth";
import { COLLECTIONS } from "../../shared/config";
import { Order, Agent, AgentStatus } from "../../shared/types";
import { router } from "expo-router";
import { format } from "date-fns";

export default function AgentHome() {
  const auth = getAuth();
  const agentId = auth.currentUser?.uid;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const locationInterval = useRef<any>(null);

  // Listen to agent profile
  useEffect(() => {
    if (!agentId) return;
    const unsub = onSnapshot(doc(db, COLLECTIONS.AGENTS, agentId), snap => {
      if (snap.exists()) {
        const data = snap.data() as Agent;
        setAgent({ id: snap.id, ...data });
        setIsOnline(data.status !== "offline");
      }
      setLoading(false);
    });
    return () => unsub();
  }, [agentId]);

  // Listen to assigned orders
  useEffect(() => {
    if (!agentId) return;
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where("agentId", "==", agentId),
      where("status", "in", ["confirmed", "packed", "dispatched"]),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });
    return () => unsub();
  }, [agentId]);

  // GPS location broadcaster
  const startLocationBroadcast = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Location required", "Please allow location access for delivery tracking");
      return;
    }

    locationInterval.current = setInterval(async () => {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (agentId) {
        await updateDoc(doc(db, COLLECTIONS.AGENTS, agentId), {
          location: { lat: loc.coords.latitude, lng: loc.coords.longitude },
          locationUpdatedAt: serverTimestamp(),
        });
      }
    }, 5000); // Update every 5 seconds
  };

  const stopLocationBroadcast = () => {
    if (locationInterval.current) {
      clearInterval(locationInterval.current);
      locationInterval.current = null;
    }
  };

  const toggleOnline = async (value: boolean) => {
    if (!agentId) return;
    const status: AgentStatus = value ? "available" : "offline";
    await updateDoc(doc(db, COLLECTIONS.AGENTS, agentId), { status });
    setIsOnline(value);

    if (value) {
      await startLocationBroadcast();
    } else {
      stopLocationBroadcast();
    }
  };

  useEffect(() => {
    return () => stopLocationBroadcast();
  }, []);

  const acceptOrder = async (orderId: string) => {
    if (!agentId) return;
    await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
      status: "dispatched",
      statusHistory: [
        ...(orders.find(o => o.id === orderId)?.statusHistory || []),
        { status: "dispatched", timestamp: new Date().toISOString(), updatedBy: agentId },
      ],
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, COLLECTIONS.AGENTS, agentId), { status: "busy", activeOrderId: orderId });
    router.push(`/delivery/${orderId}`);
  };

  const rejectOrder = async (orderId: string) => {
    Alert.alert("Reject Order", "Are you sure you want to reject this order?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject", style: "destructive",
        onPress: async () => {
          await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
            agentId: null, updatedAt: serverTimestamp(),
          });
        },
      },
    ]);
  };

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator color="#10B981" />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {agent?.name || "Agent"} 👋</Text>
          <Text style={styles.vehicleNo}>{agent?.vehicleNumber}</Text>
        </View>
        <View style={styles.onlineToggle}>
          <Text style={[styles.onlineLabel, isOnline ? styles.onlineLabelActive : {}]}>
            {isOnline ? "Online" : "Offline"}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            trackColor={{ false: "#1C2A3E", true: "#10B98150" }}
            thumbColor={isOnline ? "#10B981" : "#4B5563"}
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{agent?.totalDeliveries || 0}</Text>
          <Text style={styles.statLabel}>Deliveries</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>⭐ {agent?.rating?.toFixed(1) || "—"}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? "#10B981" : "#EF4444" }]} />
          <Text style={styles.statLabel}>{isOnline ? "Available" : "Offline"}</Text>
        </View>
      </View>

      {/* Orders */}
      <View style={styles.ordersSection}>
        <Text style={styles.sectionTitle}>
          {orders.length > 0 ? `${orders.length} Active Order${orders.length > 1 ? "s" : ""}` : "No Active Orders"}
        </Text>

        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>Go online to receive orders</Text>
          </View>
        )}

        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          renderItem={({ item: order }) => (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderId}>Order #{order.id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.orderTime}>
                    {order.createdAt ? format(new Date(order.createdAt), "hh:mm a") : ""}
                  </Text>
                </View>
                <Text style={styles.orderAmount}>₹{order.totalAmount}</Text>
              </View>

              <View style={styles.orderAddress}>
                <Text style={styles.addressLabel}>📍 Deliver to</Text>
                <Text style={styles.addressText}>
                  {order.deliveryAddress?.line1}, {order.deliveryAddress?.city}
                </Text>
              </View>

              <View style={styles.orderMeta}>
                <Text style={styles.metaText}>🛒 {order.items?.length} items</Text>
                <Text style={styles.metaText}>💳 {order.paymentMethod?.toUpperCase()}</Text>
                <Text style={styles.metaText}>🕐 {order.deliverySlot?.slot}</Text>
              </View>

              {order.status === "confirmed" || order.status === "packed" ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectOrder(order.id)}>
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptOrder(order.id)}>
                    <Text style={styles.acceptBtnText}>Accept & Navigate</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.continueBtn}
                  onPress={() => router.push(`/delivery/${order.id}`)}
                >
                  <Text style={styles.continueBtnText}>Continue Delivery →</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            isOnline ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🏍️</Text>
                <Text style={styles.emptyText}>Waiting for orders...</Text>
              </View>
            ) : null
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060A12" },
  loadingContainer: { flex: 1, backgroundColor: "#060A12", alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 },
  greeting: { color: "#fff", fontSize: 20, fontWeight: "900" },
  vehicleNo: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  onlineToggle: { flexDirection: "row", alignItems: "center", gap: 8 },
  onlineLabel: { color: "#6B7280", fontSize: 13, fontWeight: "600" },
  onlineLabelActive: { color: "#10B981" },
  statsRow: { flexDirection: "row", gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: "#0C1220", borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#1C2A3E" },
  statValue: { color: "#fff", fontWeight: "900", fontSize: 18 },
  statLabel: { color: "#6B7280", fontSize: 11, marginTop: 4 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginBottom: 4 },
  ordersSection: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { color: "#9CA3AF", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
  offlineBanner: { backgroundColor: "#1C2A3E", borderRadius: 14, padding: 16, alignItems: "center", marginBottom: 14 },
  offlineBannerText: { color: "#6B7280", fontSize: 14 },
  orderCard: { backgroundColor: "#0C1220", borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#1C2A3E" },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  orderId: { color: "#10B981", fontWeight: "700", fontSize: 14, fontFamily: "monospace" },
  orderTime: { color: "#6B7280", fontSize: 12 },
  orderAmount: { color: "#fff", fontWeight: "900", fontSize: 20 },
  orderAddress: { backgroundColor: "#111827", borderRadius: 10, padding: 10, marginBottom: 10 },
  addressLabel: { color: "#6B7280", fontSize: 11, marginBottom: 4 },
  addressText: { color: "#E8EDF8", fontSize: 13, fontWeight: "600" },
  orderMeta: { flexDirection: "row", gap: 12, marginBottom: 14 },
  metaText: { color: "#6B7280", fontSize: 12 },
  actionRow: { flexDirection: "row", gap: 10 },
  rejectBtn: { flex: 1, paddingVertical: 12, backgroundColor: "#1C2A3E", borderRadius: 12, alignItems: "center" },
  rejectBtnText: { color: "#EF4444", fontWeight: "700", fontSize: 14 },
  acceptBtn: { flex: 2, paddingVertical: 12, backgroundColor: "#10B981", borderRadius: 12, alignItems: "center" },
  acceptBtnText: { color: "#000", fontWeight: "900", fontSize: 14 },
  continueBtn: { paddingVertical: 12, backgroundColor: "#10B98120", borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#10B981" },
  continueBtnText: { color: "#10B981", fontWeight: "700", fontSize: 14 },
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: "#4B5563", fontSize: 14 },
});
