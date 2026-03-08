// customer/src/screens/Orders/OrderTracking.tsx
import { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../shared/config";
import { Order, Agent, OrderStatus } from "../../shared/types";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { format } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../hooks/useTheme";

const STATUS_STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: "confirmed", label: "Order Confirmed", icon: "✅" },
  { status: "packed", label: "Order Packed", icon: "📦" },
  { status: "dispatched", label: "Out for Delivery", icon: "🛵" },
  { status: "delivered", label: "Delivered", icon: "🎉" },
];

export default function OrderTracking() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const styles = getStyles(colors);

  // Pulse animation for live indicator
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Real-time order listener
  useEffect(() => {
    if (!orderId) return;
    const unsub = onSnapshot(doc(db, COLLECTIONS.ORDERS, orderId), snap => {
      if (snap.exists()) {
        setOrder({ id: snap.id, ...snap.data() } as Order);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [orderId]);

  // Real-time agent location listener
  useEffect(() => {
    if (!order?.agentId) return;
    const unsub = onSnapshot(doc(db, COLLECTIONS.AGENTS, order.agentId), snap => {
      if (snap.exists()) setAgent({ id: snap.id, ...snap.data() } as Agent);
    });
    return () => unsub();
  }, [order?.agentId]);

  if (loading || !order) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.status === order.status);
  const isLive = order.status === "dispatched";
  const isDelivered = order.status === "delivered";

  return (
    <View style={styles.container}>
      {/* Map (visible when dispatched) */}
      {(isLive || isDelivered) && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: order.deliveryAddress?.location?.lat || 12.9716,
              longitude: order.deliveryAddress?.location?.lng || 77.5946,
              latitudeDelta: 0.04,
              longitudeDelta: 0.04,
            }}
          >
            {/* Delivery Address Marker */}
            <Marker
              coordinate={{
                latitude: order.deliveryAddress?.location?.lat || 12.9716,
                longitude: order.deliveryAddress?.location?.lng || 77.5946,
              }}
              title="Your Location"
              pinColor={colors.green}
            />

            {/* Agent Live Location */}
            {agent?.location && (
              <Marker
                coordinate={{ latitude: agent.location.lat, longitude: agent.location.lng }}
                title={`Agent: ${agent.name}`}
              >
                <View style={styles.agentMarker}>
                  <Text style={{ fontSize: 20 }}>🛵</Text>
                </View>
              </Marker>
            )}
          </MapView>

          {/* Live badge */}
          {isLive && (
            <View style={styles.liveBadge}>
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
      )}

      <ScrollView
        style={[styles.sheet, !isLive && { flex: 1 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back + Title */}
        <View style={[styles.sheetHeader, !isLive && !isDelivered && { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/orders");
            }
          }}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderTitle}>Order #{order.id.slice(-6).toUpperCase()}</Text>
            <Text style={styles.orderSubtitle}>
              {order.createdAt
                ? format(
                  order.createdAt instanceof Timestamp
                    ? order.createdAt.toDate()
                    : new Date(order.createdAt),
                  "dd MMM, hh:mm a"
                )
                : ""}
            </Text>
          </View>
          <Text style={styles.orderAmount}>₹{order.totalAmount}</Text>
        </View>

        {/* Agent Card (when dispatched) */}
        {isLive && agent && (
          <View style={styles.agentCard}>
            <View style={styles.agentAvatar}>
              <Text style={{ fontSize: 24 }}>🛵</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.agentName}>{agent.name}</Text>
              <Text style={styles.agentVehicle}>{agent.vehicleNumber}</Text>
              {order.expectedEta && (() => {
                const etaDate = new Date(order.expectedEta);
                const diffMins = Math.max(0, Math.round((etaDate.getTime() - Date.now()) / 60000));
                const rel = diffMins < 1 ? "arriving now"
                  : diffMins < 60 ? `~${diffMins} min`
                    : `~${Math.round(diffMins / 60)}h ${diffMins % 60}m`;
                return (
                  <Text style={styles.eta}>
                    Arriving {rel} · {format(etaDate, "hh:mm a")}
                  </Text>
                );
              })()}
            </View>
            <TouchableOpacity style={styles.callBtn}>
              <Text style={{ fontSize: 20 }}>📞</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status Timeline */}
        <View style={styles.timeline}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          {STATUS_STEPS.map((step, index) => {
            const isDone = currentStepIndex >= index;
            const isCurrent = currentStepIndex === index;
            return (
              <View key={step.status} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, isDone && styles.timelineDotDone, isCurrent && styles.timelineDotCurrent]}>
                    {isDone && <Text style={{ fontSize: 12 }}>{step.icon}</Text>}
                  </View>
                  {index < STATUS_STEPS.length - 1 && (
                    <View style={[styles.timelineLine, isDone && styles.timelineLineDone]} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, isDone && styles.timelineLabelDone]}>
                    {step.label}
                  </Text>
                  {order.statusHistory && (() => {
                    const entry = order.statusHistory.find(h => h.status === step.status);
                    return entry?.timestamp ? (
                      <Text style={styles.timelineTime}>
                        {format(new Date(entry.timestamp), "hh:mm a")}
                      </Text>
                    ) : null;
                  })()}
                </View>
              </View>
            );
          })}
        </View>

        {/* Order Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Items ({order.items?.length})</Text>
          {order.items?.map((item, i) => (
            <View key={i} style={styles.orderItem}>
              <Text style={styles.itemQty}>{item.qty}×</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>₹{item.qty * item.price}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.orderItem}>
            <Text style={[styles.itemName, { color: "#fff", fontWeight: "900", flex: 1 }]}>Total</Text>
            <Text style={[styles.itemPrice, { color: "#2ECC71", fontSize: 18, fontWeight: "900" }]}>₹{order.totalAmount}</Text>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.addressSection}>
          <Text style={styles.sectionTitle}>Delivering To</Text>
          <Text style={styles.addressText}>
            {order.deliveryAddress?.line1}
            {order.deliveryAddress?.line2 ? `, ${order.deliveryAddress.line2}` : ""}
          </Text>
          <Text style={styles.addressCity}>
            {order.deliveryAddress?.city} - {order.deliveryAddress?.pincode}
          </Text>
        </View>

        {/* Review prompt after delivery */}
        {isDelivered && (
          <TouchableOpacity style={styles.reviewBtn} onPress={() => router.push(`/review/${orderId}`)}>
            <Text style={styles.reviewBtnText}>⭐ Rate your experience</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingContainer: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  loadingText: { color: colors.textSecondary },
  mapContainer: { height: 260, position: "relative" },
  map: { flex: 1 },
  agentMarker: { backgroundColor: colors.bg, borderRadius: 20, padding: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  liveBadge: { position: "absolute", top: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
  liveText: { color: "#fff", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 20, paddingTop: 28 },
  backArrow: { color: colors.textPrimary, fontSize: 22 },
  orderTitle: { color: colors.textPrimary, fontWeight: "900", fontSize: 16 },
  orderSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  orderAmount: { color: colors.green, fontWeight: "900", fontSize: 18 },
  agentCard: { flexDirection: "row", alignItems: "center", gap: 14, marginHorizontal: 20, marginBottom: 8, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.greenBorder },
  agentAvatar: { width: 48, height: 48, backgroundColor: colors.greenDim, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  agentName: { color: colors.textPrimary, fontWeight: "700", fontSize: 14 },
  agentVehicle: { color: colors.textSecondary, fontSize: 12 },
  eta: { color: colors.green, fontSize: 12, fontWeight: "600", marginTop: 3 },
  callBtn: { width: 40, height: 40, backgroundColor: colors.surfaceAlt, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  timeline: { paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: { color: colors.textTertiary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 },
  timelineItem: { flexDirection: "row", gap: 14 },
  timelineLeft: { alignItems: "center", width: 32 },
  timelineDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceAlt, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  timelineDotDone: { backgroundColor: colors.greenDim, borderColor: colors.green },
  timelineDotCurrent: { backgroundColor: colors.greenDim, borderColor: colors.green, shadowColor: colors.green, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8 },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 4, minHeight: 20 },
  timelineLineDone: { backgroundColor: colors.green },
  timelineContent: { flex: 1, paddingBottom: 20 },
  timelineLabel: { color: colors.textTertiary, fontSize: 14, fontWeight: "600" },
  timelineLabelDone: { color: colors.textPrimary },
  timelineTime: { color: colors.textSecondary, fontSize: 11, marginTop: 3 },
  itemsSection: { marginHorizontal: 20, marginBottom: 16, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  orderItem: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  itemQty: { color: colors.textSecondary, fontSize: 13, width: 24 },
  itemName: { flex: 1, color: colors.textSecondary, fontSize: 13 },
  itemPrice: { color: colors.textPrimary, fontWeight: "700", fontSize: 13 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  addressSection: { marginHorizontal: 20, marginBottom: 20, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  addressText: { color: colors.textPrimary, fontSize: 14 },
  addressCity: { color: colors.textSecondary, fontSize: 13, marginTop: 3 },
  reviewBtn: { margin: 20, backgroundColor: colors.green, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 40 },
  reviewBtnText: { color: colors.bg, fontWeight: "900", fontSize: 15 },
});
