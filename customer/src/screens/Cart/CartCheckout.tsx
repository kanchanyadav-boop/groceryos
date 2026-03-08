// customer/src/screens/Cart/CartCheckout.tsx
import { useState, useMemo, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image,
} from "react-native";
import { useCartStore, useAuthStore, useAppStore } from "../../store";
import { APP_CONFIG, COLLECTIONS, RAZORPAY_KEY_ID } from "../../shared/config";
import { collection, doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, ensureAuth } from "../../lib/firebase";
import { router } from "expo-router";
import { format, addDays } from "date-fns";
import { SlotConfig, DeliverySlotsConfig } from "../../shared/types";
import { useTheme } from "../../hooks/useTheme";

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
  const { colors } = useTheme();
  const { items, updateQty, clearCart, getItemCount } = useCartStore();
  const { user, firebaseUid, isLoggedIn } = useAuthStore();
  const { selectedAddress, selectedSlot, setSelectedSlot, selectedPincode, serviceableStoreId } = useAppStore();
  const [paymentMethod, setPaymentMethod] = useState<"cod">("cod");
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [slotConfig, setSlotConfig] = useState<DeliverySlotsConfig>(FALLBACK_SLOTS);

  const styles = getStyles(colors);

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

  const availableSlotsForSelectedDate = useMemo(
    () => getAvailableSlotsForDate(selectedDate, slotConfig),
    [selectedDate, slotConfig]
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

    if (!selectedPincode || !serviceableStoreId) {
      Alert.alert(
        "Set your delivery area",
        "Please set your pincode first so we can confirm we deliver to your area.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)/home") }]
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

    // Guard: address pincode must match the serviceable pincode on file
    if (selectedAddress.pincode !== selectedPincode) {
      Alert.alert(
        "Address outside delivery area",
        `Your selected address (${selectedAddress.pincode}) is outside your confirmed delivery area (${selectedPincode}). Please select a matching address or update your pincode.`,
        [
          { text: "Change Address", onPress: () => router.push("/address?select=1") },
          { text: "Cancel", style: "cancel" },
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
      // ── Ensure Firebase session is live ───────────────────────────────────
      let currentUser;
      try {
        currentUser = await ensureAuth();
      } catch {
        Alert.alert(
          "Please log in",
          "Tap 'My Profile' to sign in with your mobile number.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
        );
        setLoading(false);
        return;
      }

      // ── Validate inventory availability for all cart items ────────────────
      for (const item of items) {
        const invDoc = await getDoc(doc(db, "inventory", `${serviceableStoreId}_${item.skuId}`));
        if (!invDoc.exists() || (invDoc.data().available ?? 0) < item.qty) {
          Alert.alert(
            "Item unavailable",
            `Sorry, "${item.name}" is no longer available in the quantity you selected. Please update your cart.`,
            [{ text: "OK" }]
          );
          setLoading(false);
          return;
        }
      }

      // ── Write order directly to Firestore ─────────────────────────────────
      // Bypasses Cloud Functions IAM (org policy blocks allUsers on CF).
      // Firestore rules allow authenticated writes to orders/.
      const orderData = {
        userId: currentUser.uid,
        storeId: serviceableStoreId,
        status: "confirmed",
        statusHistory: [{ status: "confirmed", timestamp: new Date().toISOString(), updatedBy: currentUser.uid }],
        items: items.map(i => ({
          skuId: i.skuId,
          name: i.name,
          imageUrl: i.imageUrl || "",
          qty: i.qty,
          price: i.price,
          mrp: i.mrp,
          gst: i.gst,
          unit: i.unit,
        })),
        subtotal,
        deliveryFee,
        discount: 0,
        totalAmount: total,
        paymentMethod,
        deliveryAddress: selectedAddress,
        deliverySlot: selectedSlot,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const orderRef = await addDoc(collection(db, "orders"), orderData);
      const orderId = orderRef.id;

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
      Alert.alert("Order failed", err.message || "Something went wrong. Please try again.");
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
          const available = availableSlotsForSelectedDate;
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
          style={[styles.placeBtn, (loading || availableSlotsForSelectedDate.length === 0) && styles.placeBtnDisabled]}
          onPress={placeOrder}
          disabled={loading || availableSlotsForSelectedDate.length === 0}
        >
          {loading
            ? <ActivityIndicator color={colors.bg} />
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

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  emptyContainer: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { color: colors.textSecondary, fontSize: 16, marginBottom: 24 },
  shopBtn: { backgroundColor: colors.green, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  shopBtnText: { color: colors.bg, fontWeight: "900", fontSize: 15 },
  loginGateTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: "900", marginBottom: 10 },
  loginGateSub: { color: colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  loginGateBack: { marginTop: 16, paddingVertical: 8 },
  loginGateBackText: { color: colors.textSecondary, fontSize: 14 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  backArrow: { color: colors.textPrimary, fontSize: 22, marginRight: 12 },
  headerTitle: { flex: 1, color: colors.textPrimary, fontSize: 20, fontWeight: "900" },
  itemCount: { color: colors.textSecondary, fontSize: 13 },
  section: { marginHorizontal: 16, marginBottom: 14, backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { color: colors.textTertiary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
  changeLink: { color: colors.green, fontWeight: "700", fontSize: 13 },
  cartItem: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  itemImage: { width: 52, height: 52, borderRadius: 10 },
  imgFallback: { backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1 },
  itemName: { color: colors.textPrimary, fontSize: 13, fontWeight: "600" },
  itemUnit: { color: colors.textTertiary, fontSize: 11, marginTop: 2 },
  itemPrice: { color: colors.green, fontSize: 12, fontWeight: "700", marginTop: 3 },
  qtyControl: { flexDirection: "row", alignItems: "center", backgroundColor: colors.green, borderRadius: 8, overflow: "hidden" },
  qtyBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  qtyBtnText: { color: colors.bg, fontWeight: "900", fontSize: 18 },
  qtyText: { color: colors.bg, fontWeight: "900", fontSize: 14, paddingHorizontal: 6 },
  itemTotal: { color: colors.textPrimary, fontWeight: "800", fontSize: 14, minWidth: 52, textAlign: "right" },
  addressCard: { backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 12 },
  addressLabel: { color: colors.textPrimary, fontWeight: "700", fontSize: 13, marginBottom: 6 },
  addressLine: { color: colors.textPrimary, fontSize: 13 },
  addressCity: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  addAddressBtn: { borderWidth: 1, borderColor: colors.greenBorder, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  addAddressText: { color: colors.green, fontWeight: "600", fontSize: 14 },
  dateChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.surfaceAlt, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  dateChipActive: { borderColor: colors.green, backgroundColor: colors.greenDim },
  dateChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  dateChipTextActive: { color: colors.green },
  slotRow: { gap: 8 },
  slotChip: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  slotChipActive: { borderColor: colors.green, backgroundColor: colors.greenDim },
  slotEmoji: { fontSize: 22 },
  slotLabel: { color: colors.textSecondary, fontWeight: "700", fontSize: 14 },
  slotLabelActive: { color: colors.green },
  slotTime: { color: colors.textTertiary, fontSize: 12, marginTop: 2 },
  slotCheck: { color: colors.green, fontWeight: "900", fontSize: 16 },
  noSlotsBox: { backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  noSlotsText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, textAlign: "center" },
  payOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.surfaceAlt, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  payOptionActive: { borderColor: colors.green, backgroundColor: colors.greenDim },
  payOptionDisabled: { opacity: 0.5 },
  payIcon: { fontSize: 22 },
  payLabel: { color: colors.textSecondary, fontWeight: "700", fontSize: 14 },
  payLabelActive: { color: colors.textPrimary },
  payLabelDisabled: { color: colors.textTertiary },
  paySub: { color: colors.textTertiary, fontSize: 11, marginTop: 2 },
  comingSoonBadge: { backgroundColor: colors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  comingSoonText: { color: colors.textTertiary, fontSize: 10, fontWeight: "700" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: colors.green },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  summaryLabel: { color: colors.textSecondary, fontSize: 14 },
  summaryValue: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  freeText: { color: colors.green, fontWeight: "700", fontSize: 14 },
  freeHint: { color: colors.textSecondary, fontSize: 11, marginBottom: 10 },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 4, marginBottom: 0 },
  totalLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: "900" },
  totalValue: { color: colors.green, fontSize: 22, fontWeight: "900" },
  placeSection: { paddingHorizontal: 16, paddingBottom: 48 },
  placeBtn: { backgroundColor: colors.green, borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  placeBtnDisabled: { opacity: 0.6 },
  placeBtnText: { color: colors.bg, fontWeight: "900", fontSize: 17 },
  placeBtnAmt: { color: colors.bg, fontWeight: "700", fontSize: 17, opacity: 0.8 },
  disclaimer: { color: colors.textTertiary, fontSize: 11, textAlign: "center", marginTop: 12 },
});
