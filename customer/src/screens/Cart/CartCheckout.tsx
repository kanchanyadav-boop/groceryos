// customer/src/screens/Cart/CartCheckout.tsx
import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image,
} from "react-native";
import { useCartStore, useAuthStore, useAppStore } from "../../store";
import { APP_CONFIG, RAZORPAY_KEY_ID } from "../../shared/config";
import { getFunctions, httpsCallable } from "firebase/functions";
import { router } from "expo-router";
import { format, addDays } from "date-fns";

// After: npx expo install react-native-razorpay  →  uncomment below
// import RazorpayCheckout from "react-native-razorpay";

const SLOTS = ["AM", "PM"] as const;

export default function CartCheckout() {
  const { items, updateQty, clearCart } = useCartStore();
  const { user, firebaseUid } = useAuthStore();
  const { selectedAddress, selectedSlot, setSelectedSlot } = useAppStore();
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "cod">("upi");
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const deliveryFee = subtotal >= APP_CONFIG.freeDeliveryAbove ? 0 : APP_CONFIG.deliveryFee;
  const total = subtotal + deliveryFee;

  const deliveryDates = Array.from({ length: 3 }, (_, i) =>
    format(addDays(new Date(), i), "yyyy-MM-dd")
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
      const functions = getFunctions();
      const placeOrderFn = httpsCallable(functions, "placeOrder");

      const result = await placeOrderFn({
        items: items.map(i => ({ skuId: i.skuId, qty: i.qty })),
        deliveryAddress: selectedAddress,
        deliverySlot: selectedSlot,
        paymentMethod,
      }) as any;

      const { orderId, totalAmount, razorpayOrderId } = result.data;

      if (paymentMethod === "cod") {
        clearCart();
        router.replace({ pathname: "/order-success", params: { orderId } });
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
        theme: { color: "#10B981" },
      };
      try {
        const rzpData: any = await RazorpayCheckout.open(rzpOptions);
        const verifyFn = httpsCallable(functions, "verifyPayment");
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
        [{ text: "OK", onPress: () => { clearCart(); router.replace({ pathname: "/order-success", params: { orderId } }); } }]
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
        <View style={styles.slotRow}>
          {SLOTS.map(slot => {
            const active = selectedSlot?.slot === slot && selectedSlot?.date === selectedDate;
            return (
              <TouchableOpacity
                key={slot}
                style={[styles.slotChip, active && styles.slotChipActive]}
                onPress={() => setSelectedSlot({ date: selectedDate, slot })}
              >
                <Text style={styles.slotEmoji}>{slot === "AM" ? "🌅" : "🌇"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.slotLabel, active && styles.slotLabelActive]}>
                    {slot === "AM" ? "Morning" : "Evening"}
                  </Text>
                  <Text style={styles.slotTime}>{slot === "AM" ? "9am – 1pm" : "2pm – 7pm"}</Text>
                </View>
                {active && <Text style={styles.slotCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        {(["upi", "card", "cod"] as const).map(method => (
          <TouchableOpacity
            key={method}
            style={[styles.payOption, paymentMethod === method && styles.payOptionActive]}
            onPress={() => setPaymentMethod(method)}
          >
            <Text style={styles.payIcon}>
              {method === "upi" ? "📱" : method === "card" ? "💳" : "💵"}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.payLabel, paymentMethod === method && styles.payLabelActive]}>
                {method === "upi" ? "UPI / Wallet" : method === "card" ? "Credit / Debit Card" : "Cash on Delivery"}
              </Text>
              <Text style={styles.paySub}>
                {method === "upi" ? "GPay, PhonePe, Paytm..." : method === "card" ? "Visa, Mastercard, RuPay" : "Pay when you receive"}
              </Text>
            </View>
            <View style={[styles.radio, paymentMethod === method && styles.radioActive]}>
              {paymentMethod === method && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}
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
  container: { flex: 1, backgroundColor: "#060A12" },
  emptyContainer: { flex: 1, backgroundColor: "#060A12", alignItems: "center", justifyContent: "center", padding: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { color: "#6B7280", fontSize: 16, marginBottom: 24 },
  shopBtn: { backgroundColor: "#10B981", borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  shopBtnText: { color: "#000", fontWeight: "900", fontSize: 15 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  backArrow: { color: "#fff", fontSize: 22, marginRight: 12 },
  headerTitle: { flex: 1, color: "#fff", fontSize: 20, fontWeight: "900" },
  itemCount: { color: "#6B7280", fontSize: 13 },
  section: { marginHorizontal: 16, marginBottom: 14, backgroundColor: "#0C1220", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#1C2A3E" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { color: "#9CA3AF", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
  changeLink: { color: "#10B981", fontWeight: "700", fontSize: 13 },
  cartItem: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  itemImage: { width: 52, height: 52, borderRadius: 10 },
  imgFallback: { backgroundColor: "#1C2A3E", alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1 },
  itemName: { color: "#E8EDF8", fontSize: 13, fontWeight: "600" },
  itemUnit: { color: "#4B5563", fontSize: 11, marginTop: 2 },
  itemPrice: { color: "#10B981", fontSize: 12, fontWeight: "700", marginTop: 3 },
  qtyControl: { flexDirection: "row", alignItems: "center", backgroundColor: "#10B981", borderRadius: 8, overflow: "hidden" },
  qtyBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  qtyBtnText: { color: "#000", fontWeight: "900", fontSize: 18 },
  qtyText: { color: "#000", fontWeight: "900", fontSize: 14, paddingHorizontal: 6 },
  itemTotal: { color: "#fff", fontWeight: "800", fontSize: 14, minWidth: 52, textAlign: "right" },
  addressCard: { backgroundColor: "#111827", borderRadius: 12, padding: 12 },
  addressLabel: { color: "#fff", fontWeight: "700", fontSize: 13, marginBottom: 6 },
  addressLine: { color: "#E8EDF8", fontSize: 13 },
  addressCity: { color: "#6B7280", fontSize: 12, marginTop: 3 },
  addAddressBtn: { borderWidth: 1, borderColor: "#10B98140", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  addAddressText: { color: "#10B981", fontWeight: "600", fontSize: 14 },
  dateChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#111827", borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: "#1F2937" },
  dateChipActive: { borderColor: "#10B981", backgroundColor: "#10B98120" },
  dateChipText: { color: "#6B7280", fontSize: 13, fontWeight: "600" },
  dateChipTextActive: { color: "#10B981" },
  slotRow: { gap: 8 },
  slotChip: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: "#111827", borderRadius: 14, borderWidth: 1, borderColor: "#1F2937" },
  slotChipActive: { borderColor: "#10B981", backgroundColor: "#10B98115" },
  slotEmoji: { fontSize: 22 },
  slotLabel: { color: "#6B7280", fontWeight: "700", fontSize: 14 },
  slotLabelActive: { color: "#10B981" },
  slotTime: { color: "#4B5563", fontSize: 12, marginTop: 2 },
  slotCheck: { color: "#10B981", fontWeight: "900", fontSize: 16 },
  payOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: "#111827", borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: "#1F2937" },
  payOptionActive: { borderColor: "#10B981", backgroundColor: "#10B98110" },
  payIcon: { fontSize: 22 },
  payLabel: { color: "#9CA3AF", fontWeight: "700", fontSize: 14 },
  payLabelActive: { color: "#E8EDF8" },
  paySub: { color: "#4B5563", fontSize: 11, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#2D3D55", alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: "#10B981" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#10B981" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  summaryLabel: { color: "#6B7280", fontSize: 14 },
  summaryValue: { color: "#E8EDF8", fontSize: 14, fontWeight: "600" },
  freeText: { color: "#10B981", fontWeight: "700", fontSize: 14 },
  freeHint: { color: "#6B7280", fontSize: 11, marginBottom: 10 },
  totalRow: { borderTopWidth: 1, borderTopColor: "#1C2A3E", paddingTop: 12, marginTop: 4, marginBottom: 0 },
  totalLabel: { color: "#fff", fontSize: 16, fontWeight: "900" },
  totalValue: { color: "#10B981", fontSize: 22, fontWeight: "900" },
  placeSection: { paddingHorizontal: 16, paddingBottom: 48 },
  placeBtn: { backgroundColor: "#10B981", borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  placeBtnDisabled: { opacity: 0.6 },
  placeBtnText: { color: "#000", fontWeight: "900", fontSize: 17 },
  placeBtnAmt: { color: "#000", fontWeight: "700", fontSize: 17, opacity: 0.8 },
  disclaimer: { color: "#374151", fontSize: 11, textAlign: "center", marginTop: 12 },
});
