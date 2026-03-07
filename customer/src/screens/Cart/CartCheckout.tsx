// customer/src/screens/Cart/CartCheckout.tsx
import { useState, useMemo, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image,
} from "react-native";
import { useCartStore, useAuthStore, useAppStore } from "../../store";
import { APP_CONFIG, COLLECTIONS, RAZORPAY_KEY_ID } from "../../shared/config";
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import app, { auth, db, functions } from "../../lib/firebase";
import { router } from "expo-router";
import { format, addDays } from "date-fns";
import { SlotConfig, DeliverySlotsConfig } from "../../shared/types";

// functions imported from ../../lib/firebase — shared instance with auth

// After: npx expo install react-native-razorpay  →  uncomment below
// import RazorpayCheckout from "react-native-razorpay";

const FALLBACK_SLOTS: DeliverySlotsConfig = {
  slots: [
    { id: "AM", name: "Morning", emoji: "🌅", timeRange: "9am – 1pm", cutoffHour: 7, capacityPerDay: 50, isActive: true },
    { id: "PM", name: "Evening", emoji: "🌇", timeRange: "2pm – 7pm", cutoffHour: 12, capacityPerDay: 50, isActive: true },
  ],
  advanceDays: 3,
};

/** Returns only the slots a customer can actually book for a given date. */
function getAvailableSlotsForDate(date: string, config: DeliverySlotsConfig): SlotConfig[] {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isToday = date === todayStr;
  const currentHour = new Date().getHours();
  return config.slots.filter(slot => {
    if (!slot.isActive) return false;
    // For today, hide slots whose booking cutoff has passed
    if (isToday && currentHour >= slot.cutoffHour) return false;
    return true;
  });
}

export default function CartCheckout() {
  const { items, updateQty, clearCart, getItemCount } = useCartStore();
  const { user, firebaseUid, isLoggedIn } = useAuthStore();
  const { selectedAddress, selectedSlot, setSelectedSlot } = useAppStore();
  const [paymentMethod, setPaymentMethod] = useState<"cod">("cod");
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [slotConfig, setSlotConfig] = useState<DeliverySlotsConfig>(FALLBACK_SLOTS);

  // Fetch admin-defined slot config from Firestore
  useEffect(() => {
    getDoc(doc(db, COLLECTIONS.SETTINGS, "deliverySlots"))
      .then(snap => { if (snap.exists()) setSlotConfig(snap.data() as DeliverySlotsConfig); })
      .catch(() => { }); // keep fallback on error
  }, []);

  // Clear selected slot when switching dates if it's no longer available
  useEffect(() => {
    if (!selectedSlot) return;
    const available = getAvailableSlotsForDate(selectedDate, slotConfig);
    if (!available.find(s => s.id === selectedSlot.slot)) {
      setSelectedSlot(null);
    }
  }, [selectedDate, slotConfig]);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const deliveryFee = subtotal >= APP_CONFIG.freeDeliveryAbove ? 0 : APP_CONFIG.deliveryFee;
  const total = subtotal + deliveryFee;

  const deliveryDates = useMemo(
    () => Array.from({ length: slotConfig.advanceDays }, (_, i) => format(addDays(new Date(), i), "yyyy-MM-dd")),
    [slotConfig.advanceDays]
  );

  const placeOrder = async () => {
    // Check if user is logged in
    if (!user || !firebaseUid) {
      Alert.alert(
        "Login Required",
        "Please login to place your order. Your cart will be saved.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Login",
            onPress: () => router.push("/(auth)/login")
          },
        ]
      );
      return;
    }

    if (!selectedAddress) {
      Alert.alert(
        "No address selected",
        "Please add or select a delivery address.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add Address", onPress: () => router.push("/address?select=1") },
        ]
      );
      return;
    }
    if (!selectedSlot) {
      Alert.alert("Select delivery slot", "Please choose when you'd like your order delivered.");
      return;
    }

    setLoading(true);
    try {
      // ── Token refresh ─────────────────────────────────────────────────────────
      // Force-refresh the Firebase ID token before every sensitive CF call.
      // This guarantees the SDK attaches a valid Bearer token even if the cached
      // token is stale or the auth state was restored from AsyncStorage.
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Session expired", "Your session has expired. Please log in again.");
        router.replace("/(auth)/login");
        return;
      }
      await currentUser.getIdToken(/* forceRefresh= */ true);

      const placeOrderFn = httpsCallable(functions, "placeOrder");
      const result = await placeOrderFn({
        items: items.map(i => ({ skuId: i.skuId, qty: i.qty })),
        deliveryAddress: selectedAddress,
        deliverySlot: selectedSlot,
        paymentMethod,
      }) as any;

      const { orderId, totalAmount, razorpayOrderId } = result.data;

      const itemCount = items.reduce((a, i) => a + i.qty, 0);
      if (paymentMethod === "cod") {
        clearCart();
        router.replace({ pathname: "/order-success", params: { orderId, total: String(total), itemCount: String(itemCount) } });
        return;
      }

      // ── Razorpay Online Payment ──────────────────────────────────────────
      // Uncomment after installing react-native-razorpay:
      /*
      const rzpOptions = {
        description: "Green's Supermarket Order",
        currency: "INR",
        key: RAZORPAY_KEY_ID,
        amount: totalAmount * 100,
        name: APP_CONFIG.appName,
        order_id: razorpayOrderId,
        prefill: { email: user.email || "", contact: user.phone, name: user.name },
        theme: { color: "#2ECC71" },
      };
      try {
        const rzpData: any = await RazorpayCheckout.open(rzpOptions);
        const verifyFn = httpsCallable(functions, "verifyPayment"); // uses module-level functions
        await verifyFn({
          razorpayOrderId: rzpData.razorpay_order_id,
          razorpayPaymentId: rzpData.razorpay_payment_id,
          razorpaySignature: rzpData.razorpay_signature,
          orderId,
          amount: totalAmount,
          method: paymentMethod,
        });
        clearCart();
        router.replace({ pathname: "/order-success", params: { orderId } });
      } catch (payErr: any) {
        if (payErr?.code !== "PAYMENT_CANCELLED") {
          Alert.alert("Payment failed", payErr?.description || "Please try again.");
        }
      }
      */

      // Temp placeholder — remove once Razorpay SDK is installed
      Alert.alert(
        "Install Razorpay",
        "Run: npx expo install react-native-razorpay\nThen uncomment the payment block in CartCheckout.tsx.",
        [{ text: "OK", onPress: () => { clearCart(); router.replace({ pathname: "/order-success", params: { orderId, total: String(total), itemCount: String(items.reduce((a, i) => a + i.qty, 0)) } }); } }]
      );

    } catch (err: any) {
      Alert.alert("Order failed", err.message || "Please try again.");
    }
    setLoading(false);
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🛒</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <TouchableOpacity style={styles.shopBtn} onPress={() => router.back()}>
          <Text style={styles.shopBtnText}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isLoggedIn) {
    const cartCount = getItemCount();
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🔐</Text>
        <Text style={styles.loginGateTitle}>Login to continue</Text>
        <Text style={styles.loginGateSub}>
          {cartCount} item{cartCount !== 1 ? "s" : ""} saved in your cart.{"\n"}
          Login to place your order.
        </Text>
        <TouchableOpacity style={styles.shopBtn} onPress={() => router.push("/(auth)/login")}>
          <Text style={styles.shopBtnText}>Login / Sign up</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.loginGateBack}>
          <Text style={styles.loginGateBackText}>← Continue browsing</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <Text style={styles.itemCount}>{items.reduce((a, i) => a + i.qty, 0)} items</Text>
      </View>

      {/* Cart Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {items.map(item => (
          <View key={item.skuId} style={styles.cartItem}>
            {item.imageUrl
              ? <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
              : <View style={[styles.itemImage, styles.imgFallback]}><Text style={{ fontSize: 20 }}>🛒</Text></View>
            }
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.itemUnit}>{item.unit}</Text>
              <Text style={styles.itemPrice}>₹{item.price}</Text>
            </View>
            <View style={styles.qtyControl}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.skuId, item.qty - 1)}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{item.qty}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.skuId, item.qty + 1)}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.itemTotal}>₹{item.price * item.qty}</Text>
          </View>
        ))}
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <TouchableOpacity onPress={() => router.push("/address?select=1")}>
            <Text style={styles.changeLink}>{selectedAddress ? "Change" : "+ Add"}</Text>
          </TouchableOpacity>
        </View>
        {selectedAddress ? (
          <View style={styles.addressCard}>
            <Text style={styles.addressLabel}>
              {selectedAddress.label === "Home" ? "🏠" : selectedAddress.label === "Work" ? "🏢" : "📍"} {selectedAddress.label}
            </Text>
            <Text style={styles.addressLine}>{selectedAddress.line1}</Text>
            {selectedAddress.line2 ? <Text style={styles.addressLine}>{selectedAddress.line2}</Text> : null}
            <Text style={styles.addressCity}>{selectedAddress.city} — {selectedAddress.pincode}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.addAddressBtn} onPress={() => router.push("/address?select=1")}>
            <Text style={styles.addAddressText}>📍  Tap to add delivery address</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Delivery Slot */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Slot</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {deliveryDates.map(date => (
            <TouchableOpacity
              key={date}
              style={[styles.dateChip, selectedDate === date && styles.dateChipActive]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[styles.dateChipText, selectedDate === date && styles.dateChipTextActive]}>
                {date === format(new Date(), "yyyy-MM-dd") ? "Today" : format(new Date(date + "T12:00:00"), "EEE, dd MMM")}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {(() => {
          const available = getAvailableSlotsForDate(selectedDate, slotConfig);
          if (available.length === 0) {
            return (
              <View style={styles.noSlotsBox}>
                <Text style={styles.noSlotsText}>
                  No slots available for today — all booking windows have passed.
                  {"\n"}Please select a future date.
                </Text>
              </View>
            );
          }
          return (
            <View style={styles.slotRow}>
              {available.map(slot => {
                const active = selectedSlot?.slot === slot.id && selectedSlot?.date === selectedDate;
                return (
                  <TouchableOpacity
                    key={slot.id}
                    style={[styles.slotChip, active && styles.slotChipActive]}
                    onPress={() => setSelectedSlot({ date: selectedDate, slot: slot.id })}
                  >
                    <Text style={styles.slotEmoji}>{slot.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.slotLabel, active && styles.slotLabelActive]}>
                        {slot.name}
                      </Text>
                      <Text style={styles.slotTime}>{slot.timeRange}</Text>
                    </View>
                    {active && <Text style={styles.slotCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })()}
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        {(["upi", "card", "cod"] as const).map(method => {
          const isDisabled = method !== "cod";
          return (
            <TouchableOpacity
              key={method}
              style={[
                styles.payOption,
                paymentMethod === method && styles.payOptionActive,
                isDisabled && styles.payOptionDisabled,
              ]}
              onPress={() => !isDisabled && setPaymentMethod(method as "cod")}
              activeOpacity={isDisabled ? 1 : 0.7}
            >
              <Text style={[styles.payIcon, isDisabled && { opacity: 0.4 }]}>
                {method === "upi" ? "📱" : method === "card" ? "💳" : "💵"}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.payLabel,
                  paymentMethod === method && styles.payLabelActive,
                  isDisabled && styles.payLabelDisabled,
                ]}>
                  {method === "upi" ? "UPI / Wallet" : method === "card" ? "Credit / Debit Card" : "Cash on Delivery"}
                </Text>
                <Text style={styles.paySub}>
                  {isDisabled
                    ? "Coming soon"
                    : method === "cod" ? "Pay when you receive" : ""}
                </Text>
              </View>
              {isDisabled ? (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Soon</Text>
                </View>
              ) : (
                <View style={[styles.radio, paymentMethod === method && styles.radioActive]}>
                  {paymentMethod === method && <View style={styles.radioDot} />}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>₹{subtotal}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Fee</Text>
          <Text style={deliveryFee === 0 ? styles.freeText : styles.summaryValue}>
            {deliveryFee === 0 ? "FREE 🎉" : `₹${deliveryFee}`}
          </Text>
        </View>
        {deliveryFee > 0 && (
          <Text style={styles.freeHint}>Add ₹{APP_CONFIG.freeDeliveryAbove - subtotal} more for free delivery</Text>
        )}
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{total}</Text>
        </View>
      </View>

      {/* Place Order */}
      <View style={styles.placeSection}>
        <TouchableOpacity
          style={[styles.placeBtn, loading && styles.placeBtnDisabled]}
          onPress={placeOrder}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#000" />
            : <>
              <Text style={styles.placeBtnText}>Place Order</Text>
              <Text style={styles.placeBtnAmt}> · ₹{total}</Text>
            </>
          }
        </TouchableOpacity>
        <Text style={styles.disclaimer}>By placing this order you agree to our Terms of Service</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },
  emptyContainer: { flex: 1, backgroundColor: "#0F1117", alignItems: "center", justifyContent: "center", padding: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { color: "#8A8A9A", fontSize: 16, marginBottom: 24 },
  shopBtn: { backgroundColor: "#2ECC71", borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  shopBtnText: { color: "#000", fontWeight: "900", fontSize: 15 },
  loginGateTitle: { color: "#fff", fontSize: 22, fontWeight: "900", marginBottom: 10 },
  loginGateSub: { color: "#8A8A9A", fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  loginGateBack: { marginTop: 16, paddingVertical: 8 },
  loginGateBackText: { color: "#8A8A9A", fontSize: 14 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  backArrow: { color: "#fff", fontSize: 22, marginRight: 12 },
  headerTitle: { flex: 1, color: "#fff", fontSize: 20, fontWeight: "900" },
  itemCount: { color: "#8A8A9A", fontSize: 13 },
  section: { marginHorizontal: 16, marginBottom: 14, backgroundColor: "#16181F", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#262830" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { color: "#7A7A8E", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
  changeLink: { color: "#2ECC71", fontWeight: "700", fontSize: 13 },
  cartItem: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  itemImage: { width: 52, height: 52, borderRadius: 10 },
  imgFallback: { backgroundColor: "#262830", alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1 },
  itemName: { color: "#F0F0F5", fontSize: 13, fontWeight: "600" },
  itemUnit: { color: "#4E4E60", fontSize: 11, marginTop: 2 },
  itemPrice: { color: "#2ECC71", fontSize: 12, fontWeight: "700", marginTop: 3 },
  qtyControl: { flexDirection: "row", alignItems: "center", backgroundColor: "#2ECC71", borderRadius: 8, overflow: "hidden" },
  qtyBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  qtyBtnText: { color: "#000", fontWeight: "900", fontSize: 18 },
  qtyText: { color: "#000", fontWeight: "900", fontSize: 14, paddingHorizontal: 6 },
  itemTotal: { color: "#fff", fontWeight: "800", fontSize: 14, minWidth: 52, textAlign: "right" },
  addressCard: { backgroundColor: "#1E2028", borderRadius: 12, padding: 12 },
  addressLabel: { color: "#fff", fontWeight: "700", fontSize: 13, marginBottom: 6 },
  addressLine: { color: "#F0F0F5", fontSize: 13 },
  addressCity: { color: "#8A8A9A", fontSize: 12, marginTop: 3 },
  addAddressBtn: { borderWidth: 1, borderColor: "#2ECC7140", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  addAddressText: { color: "#2ECC71", fontWeight: "600", fontSize: 14 },
  dateChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#1E2028", borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: "#262830" },
  dateChipActive: { borderColor: "#2ECC71", backgroundColor: "#2ECC7120" },
  dateChipText: { color: "#8A8A9A", fontSize: 13, fontWeight: "600" },
  dateChipTextActive: { color: "#2ECC71" },
  slotRow: { gap: 8 },
  slotChip: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: "#1E2028", borderRadius: 14, borderWidth: 1, borderColor: "#262830" },
  slotChipActive: { borderColor: "#2ECC71", backgroundColor: "#2ECC7115" },
  slotEmoji: { fontSize: 22 },
  slotLabel: { color: "#8A8A9A", fontWeight: "700", fontSize: 14 },
  slotLabelActive: { color: "#2ECC71" },
  slotTime: { color: "#4E4E60", fontSize: 12, marginTop: 2 },
  slotCheck: { color: "#2ECC71", fontWeight: "900", fontSize: 16 },
  noSlotsBox: { backgroundColor: "#1E2028", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#262830" },
  noSlotsText: { color: "#7A7A8E", fontSize: 13, lineHeight: 20, textAlign: "center" },
  payOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: "#1E2028", borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: "#262830" },
  payOptionActive: { borderColor: "#2ECC71", backgroundColor: "#2ECC7110" },
  payOptionDisabled: { opacity: 0.5 },
  payIcon: { fontSize: 22 },
  payLabel: { color: "#7A7A8E", fontWeight: "700", fontSize: 14 },
  payLabelActive: { color: "#F0F0F5" },
  payLabelDisabled: { color: "#4E4E60" },
  paySub: { color: "#4E4E60", fontSize: 11, marginTop: 2 },
  comingSoonBadge: { backgroundColor: "#2D2D40", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  comingSoonText: { color: "#4E4E60", fontSize: 10, fontWeight: "700" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#2D3D55", alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: "#2ECC71" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#2ECC71" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  summaryLabel: { color: "#8A8A9A", fontSize: 14 },
  summaryValue: { color: "#F0F0F5", fontSize: 14, fontWeight: "600" },
  freeText: { color: "#2ECC71", fontWeight: "700", fontSize: 14 },
  freeHint: { color: "#8A8A9A", fontSize: 11, marginBottom: 10 },
  totalRow: { borderTopWidth: 1, borderTopColor: "#262830", paddingTop: 12, marginTop: 4, marginBottom: 0 },
  totalLabel: { color: "#fff", fontSize: 16, fontWeight: "900" },
  totalValue: { color: "#2ECC71", fontSize: 22, fontWeight: "900" },
  placeSection: { paddingHorizontal: 16, paddingBottom: 48 },
  placeBtn: { backgroundColor: "#2ECC71", borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  placeBtnDisabled: { opacity: 0.6 },
  placeBtnText: { color: "#000", fontWeight: "900", fontSize: 17 },
  placeBtnAmt: { color: "#000", fontWeight: "700", fontSize: 17, opacity: 0.8 },
  disclaimer: { color: "#3D3D50", fontSize: 11, textAlign: "center", marginTop: 12 },
});
