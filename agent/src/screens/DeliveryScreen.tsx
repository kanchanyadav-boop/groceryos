// agent/src/screens/DeliveryScreen.tsx
import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ScrollView, Linking, ActivityIndicator,
} from "react-native";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { COLLECTIONS } from "../../shared/config";
import { Order } from "../../shared/types";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { router, useLocalSearchParams } from "expo-router";

// Generate a random 4-digit delivery OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

export default function DeliveryScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const auth = getAuth();
  const agentId = auth.currentUser?.uid;
  const [order, setOrder] = useState<Order | null>(null);
  const [deliveryOtp, setDeliveryOtp] = useState<string>("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    const unsub = onSnapshot(doc(db, COLLECTIONS.ORDERS, orderId), snap => {
      if (snap.exists()) {
        const data = snap.data() as Order;
        setOrder({ id: snap.id, ...data });
        // If OTP already generated, restore it
        if ((data as any).deliveryOtp) setDeliveryOtp((data as any).deliveryOtp);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [orderId]);

  // Generate and send OTP when agent arrives
  const generateAndSendOTP = async () => {
    const otp = generateOTP();
    setDeliveryOtp(otp);

    // Save OTP to order (Cloud Function would send SMS to customer)
    await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId!), {
      deliveryOtp: otp,
      updatedAt: serverTimestamp(),
    });

    Alert.alert(
      "OTP Generated",
      `OTP ${otp} has been sent to the customer via SMS.\nAsk the customer for this OTP to confirm delivery.`,
    );
  };

  const verifyOtpAndComplete = async () => {
    if (enteredOtp !== deliveryOtp) {
      Alert.alert("Wrong OTP", "The OTP entered does not match. Please try again.");
      return;
    }

    setCompleting(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId!), {
        status: "delivered",
        proofOfDelivery: { type: "otp", value: deliveryOtp },
        statusHistory: [
          ...(order?.statusHistory || []),
          { status: "delivered", timestamp: new Date().toISOString(), updatedBy: agentId },
        ],
        updatedAt: serverTimestamp(),
      });

      // Free up the agent
      if (agentId) {
        await updateDoc(doc(db, COLLECTIONS.AGENTS, agentId), {
          status: "available",
          activeOrderId: null,
        });
      }

      setOtpVerified(true);
      setTimeout(() => router.replace("/home"), 2000);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setCompleting(false);
  };

  const openNavigation = () => {
    if (!order?.deliveryAddress?.location) return;
    const { lat, lng } = order.deliveryAddress.location;
    const url = `https://maps.google.com/maps?daddr=${lat},${lng}&dirflg=d`;
    Linking.openURL(url);
  };

  if (loading || !order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#10B981" />
      </View>
    );
  }

  if (otpVerified) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>Delivery Complete!</Text>
        <Text style={styles.successSubtitle}>Great work! Order #{order.id.slice(-6).toUpperCase()} delivered.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: order.deliveryAddress?.location?.lat || 12.9716,
            longitude: order.deliveryAddress?.location?.lng || 77.5946,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          <Marker
            coordinate={{
              latitude: order.deliveryAddress?.location?.lat || 12.9716,
              longitude: order.deliveryAddress?.location?.lng || 77.5946,
            }}
            title={`${order.deliveryAddress?.line1}`}
            pinColor="#10B981"
          />
        </MapView>
      </View>

      <View style={styles.content}>
        {/* Order Info */}
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderId}>Order #{order.id.slice(-6).toUpperCase()}</Text>
            <Text style={styles.orderAmount}>₹{order.totalAmount}</Text>
          </View>
          <Text style={styles.paymentMethod}>
            {order.paymentMethod === "cod" ? "💵 Collect ₹" + order.totalAmount + " (COD)" : "✅ Already Paid Online"}
          </Text>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Text style={styles.addressMain}>{order.deliveryAddress?.line1}</Text>
          {order.deliveryAddress?.line2 && <Text style={styles.addressSub}>{order.deliveryAddress.line2}</Text>}
          <Text style={styles.addressSub}>{order.deliveryAddress?.city} - {order.deliveryAddress?.pincode}</Text>

          <TouchableOpacity style={styles.navigateBtn} onPress={openNavigation}>
            <Text style={styles.navigateBtnText}>🗺️ Open in Google Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{order.items?.length} Items</Text>
          {order.items?.map((item, i) => (
            <View key={i} style={styles.item}>
              <Text style={styles.itemQty}>{item.qty}×</Text>
              <Text style={styles.itemName}>{item.name}</Text>
            </View>
          ))}
        </View>

        {/* OTP Delivery Confirmation */}
        <View style={styles.otpSection}>
          <Text style={styles.sectionTitle}>Proof of Delivery</Text>

          {!deliveryOtp ? (
            <TouchableOpacity style={styles.generateOtpBtn} onPress={generateAndSendOTP}>
              <Text style={styles.generateOtpText}>📲 Generate & Send OTP to Customer</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.otpSent}>
                <Text style={styles.otpSentText}>OTP sent to customer via SMS</Text>
                <Text style={styles.otpValue}>{deliveryOtp}</Text>
              </View>

              <Text style={styles.otpLabel}>Enter OTP provided by customer:</Text>
              <TextInput
                style={styles.otpInput}
                value={enteredOtp}
                onChangeText={setEnteredOtp}
                placeholder="• • • •"
                placeholderTextColor="#4B5563"
                keyboardType="number-pad"
                maxLength={4}
              />

              <TouchableOpacity
                style={[styles.confirmBtn, (enteredOtp.length !== 4 || completing) && styles.confirmBtnDisabled]}
                onPress={verifyOtpAndComplete}
                disabled={enteredOtp.length !== 4 || completing}
              >
                {completing ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.confirmBtnText}>✓ Confirm Delivery</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060A12" },
  loadingContainer: { flex: 1, backgroundColor: "#060A12", alignItems: "center", justifyContent: "center" },
  successContainer: { flex: 1, backgroundColor: "#060A12", alignItems: "center", justifyContent: "center", padding: 40 },
  successEmoji: { fontSize: 72, marginBottom: 20 },
  successTitle: { color: "#10B981", fontSize: 28, fontWeight: "900", marginBottom: 8 },
  successSubtitle: { color: "#6B7280", fontSize: 16, textAlign: "center" },
  mapContainer: { height: 240 },
  map: { flex: 1 },
  content: { padding: 20 },
  orderCard: { backgroundColor: "#0C1220", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#10B98130" },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  orderId: { color: "#10B981", fontWeight: "700", fontSize: 15, fontFamily: "monospace" },
  orderAmount: { color: "#fff", fontWeight: "900", fontSize: 20 },
  paymentMethod: { color: "#9CA3AF", fontSize: 14 },
  section: { backgroundColor: "#0C1220", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#1C2A3E" },
  sectionTitle: { color: "#9CA3AF", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  addressMain: { color: "#fff", fontSize: 15, fontWeight: "600" },
  addressSub: { color: "#6B7280", fontSize: 13, marginTop: 3 },
  navigateBtn: { marginTop: 14, backgroundColor: "#4A9EFF20", borderWidth: 1, borderColor: "#4A9EFF", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  navigateBtnText: { color: "#4A9EFF", fontWeight: "700", fontSize: 14 },
  item: { flexDirection: "row", gap: 10, marginBottom: 8 },
  itemQty: { color: "#6B7280", fontSize: 13, width: 24 },
  itemName: { color: "#E8EDF8", fontSize: 13 },
  otpSection: { backgroundColor: "#0C1220", borderRadius: 16, padding: 16, marginBottom: 40, borderWidth: 1, borderColor: "#1C2A3E" },
  generateOtpBtn: { backgroundColor: "#10B98120", borderWidth: 1, borderColor: "#10B981", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  generateOtpText: { color: "#10B981", fontWeight: "700", fontSize: 14 },
  otpSent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#111827", borderRadius: 12, padding: 14, marginBottom: 16 },
  otpSentText: { color: "#6B7280", fontSize: 12 },
  otpValue: { color: "#10B981", fontWeight: "900", fontSize: 22, letterSpacing: 6 },
  otpLabel: { color: "#9CA3AF", fontSize: 13, marginBottom: 8 },
  otpInput: { backgroundColor: "#111827", borderWidth: 1, borderColor: "#1F2937", borderRadius: 14, height: 60, textAlign: "center", color: "#fff", fontSize: 28, letterSpacing: 10, marginBottom: 16 },
  confirmBtn: { backgroundColor: "#10B981", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { color: "#000", fontWeight: "900", fontSize: 16 },
});
