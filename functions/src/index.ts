// functions/src/index.ts
// ─── All Cloud Functions for GroceryOS ───────────────────────────────────────
// Deploy: firebase deploy --only functions

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

admin.initializeApp();
const db = admin.firestore();

// ─── ENV VARS (set via: firebase functions:config:set razorpay.key_secret=XXX) ──
// Access: functions.config().razorpay.key_secret

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ORDER PLACEMENT — reserve inventory + create Razorpay order
// ═══════════════════════════════════════════════════════════════════════════════
export const placeOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required");

  const { items, deliveryAddress, deliverySlot, paymentMethod } = data;
  const userId = context.auth.uid;

  // Validate + reserve inventory in a transaction
  try {
    const result = await db.runTransaction(async (txn) => {
      let subtotal = 0;
      const validatedItems = [];

      for (const item of items) {
        const invRef = db.collection("inventory").doc(item.skuId);
        const productRef = db.collection("products").doc(item.skuId);
        const [invDoc, productDoc] = await Promise.all([txn.get(invRef), txn.get(productRef)]);

        if (!invDoc.exists || !productDoc.exists) throw new Error(`Product ${item.skuId} not found`);

        const inv = invDoc.data()!;
        const product = productDoc.data()!;

        if (inv.available < item.qty) throw new Error(`Insufficient stock for ${product.name}`);

        // Reserve inventory
        txn.update(invRef, {
          reserved: inv.reserved + item.qty,
          available: inv.available - item.qty,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const itemTotal = product.price * item.qty;
        subtotal += itemTotal;

        validatedItems.push({
          skuId: item.skuId,
          name: product.name,
          imageUrl: product.imageUrls?.[0] || "",
          qty: item.qty,
          price: product.price,
          mrp: product.mrp,
          gst: product.gstRate,
          unit: product.unit,
        });
      }

      // Calculate delivery fee
      const deliveryFee = subtotal >= 500 ? 0 : 30;
      const totalAmount = subtotal + deliveryFee;

      // Create order document
      const orderRef = db.collection("orders").doc();
      txn.set(orderRef, {
        userId,
        status: "confirmed",
        statusHistory: [{ status: "confirmed", timestamp: new Date().toISOString(), updatedBy: userId }],
        items: validatedItems,
        subtotal,
        deliveryFee,
        discount: 0,
        totalAmount,
        paymentMethod,
        deliveryAddress,
        deliverySlot,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { orderId: orderRef.id, totalAmount, subtotal, deliveryFee };
    });

    // For online payments, create Razorpay order
    if (paymentMethod !== "cod") {
      const Razorpay = require("razorpay");
      const razorpay = new Razorpay({
        key_id: functions.config().razorpay.key_id,
        key_secret: functions.config().razorpay.key_secret,
      });

      const rzpOrder = await razorpay.orders.create({
        amount: result.totalAmount * 100, // paise
        currency: "INR",
        receipt: result.orderId,
        notes: { orderId: result.orderId, userId },
      });

      await db.collection("orders").doc(result.orderId).update({
        razorpayOrderId: rzpOrder.id,
      });

      return { ...result, razorpayOrderId: rzpOrder.id };
    }

    // FCM notification to customer
    await sendOrderNotification(userId, "confirmed", result.orderId);

    return result;
  } catch (err: any) {
    throw new functions.https.HttpsError("aborted", err.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. PAYMENT VERIFICATION — verify Razorpay signature
// ═══════════════════════════════════════════════════════════════════════════════
export const verifyPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required");

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = data;
  const keySecret = functions.config().razorpay.key_secret;

  // Verify HMAC signature
  const body = razorpayOrderId + "|" + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    throw new functions.https.HttpsError("permission-denied", "Invalid payment signature");
  }

  // Update order + create payment record
  await Promise.all([
    db.collection("orders").doc(orderId).update({
      paymentId: razorpayPaymentId,
      status: "confirmed",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }),
    db.collection("payments").doc(razorpayPaymentId).set({
      orderId,
      userId: context.auth.uid,
      amount: data.amount,
      status: "captured",
      method: data.method || "online",
      razorpayPaymentId,
      razorpayOrderId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }),
  ]);

  await sendOrderNotification(context.auth.uid, "confirmed", orderId);
  return { success: true };
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. RAZORPAY WEBHOOK — handle payment events server-side
// ═══════════════════════════════════════════════════════════════════════════════
export const razorpayWebhook = functions.https.onRequest(async (req, res) => {
  const webhookSecret = functions.config().razorpay.webhook_secret;
  const signature = req.headers["x-razorpay-signature"] as string;

  // Verify webhook signature
  const expectedSig = crypto
    .createHmac("sha256", webhookSecret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (expectedSig !== signature) {
    res.status(400).send("Invalid signature");
    return;
  }

  const event = req.body.event;
  const payload = req.body.payload?.payment?.entity;

  if (event === "payment.captured") {
    const orderId = payload.notes?.orderId;
    if (orderId) {
      await db.collection("payments").doc(payload.id).set({
        orderId,
        userId: payload.notes?.userId,
        amount: payload.amount / 100,
        status: "captured",
        method: payload.method,
        razorpayPaymentId: payload.id,
        razorpayOrderId: payload.order_id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }

  if (event === "refund.processed") {
    const refundId = payload.notes?.refundDocId;
    if (refundId) {
      await db.collection("refunds").doc(refundId).update({
        status: "processed",
        razorpayRefundId: payload.id,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  res.status(200).send("OK");
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PROCESS REFUND — triggered when staff approves refund in admin panel
// ═══════════════════════════════════════════════════════════════════════════════
export const onRefundApproved = functions.firestore
  .document("refunds/{refundId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger when status changes to "approved"
    if (before.status !== "pending" || after.status !== "approved") return;

    const { refundId } = context.params;

    try {
      const Razorpay = require("razorpay");
      const razorpay = new Razorpay({
        key_id: functions.config().razorpay.key_id,
        key_secret: functions.config().razorpay.key_secret,
      });

      // Get payment record
      const paymentDoc = await db.collection("payments").doc(after.paymentId).get();
      if (!paymentDoc.exists) throw new Error("Payment not found");

      const payment = paymentDoc.data()!;

      // Call Razorpay refund API
      const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
        amount: after.amount * 100, // paise
        notes: { refundDocId: refundId, orderId: after.orderId },
      });

      // Update refund doc with Razorpay refund ID
      await change.after.ref.update({
        razorpayRefundId: refund.id,
        status: "processed",
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update order status
      await db.collection("orders").doc(after.orderId).update({
        status: "refunded",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Notify customer
      await sendOrderNotification(after.userId, "refunded", after.orderId);

    } catch (err: any) {
      console.error("Refund failed:", err);
      await change.after.ref.update({ status: "pending", refundError: err.message });
    }
  });

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ORDER STATUS CHANGE — notify customer on every status change
// ═══════════════════════════════════════════════════════════════════════════════
export const onOrderStatusChange = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === after.status) return;

    // Decrement reserved inventory when delivered or cancelled
    if (after.status === "delivered" || after.status === "cancelled") {
      for (const item of after.items || []) {
        const invRef = db.collection("inventory").doc(item.skuId);
        const invDoc = await invRef.get();
        if (!invDoc.exists) continue;
        const inv = invDoc.data()!;

        if (after.status === "delivered") {
          // Permanently decrement quantity
          await invRef.update({
            quantity: Math.max(0, inv.quantity - item.qty),
            reserved: Math.max(0, inv.reserved - item.qty),
            available: inv.available, // already decremented during reservation
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          // Release reservation on cancel
          await invRef.update({
            reserved: Math.max(0, inv.reserved - item.qty),
            available: inv.available + item.qty,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    }

    // Send FCM notification to customer
    await sendOrderNotification(after.userId, after.status, context.params.orderId);
  });

// ═══════════════════════════════════════════════════════════════════════════════
// 6. LOW STOCK ALERT — notify admin when stock drops below threshold
// ═══════════════════════════════════════════════════════════════════════════════
export const onInventoryUpdate = functions.firestore
  .document("inventory/{skuId}")
  .onUpdate(async (change) => {
    const after = change.after.data();
    const before = change.before.data();

    // Only alert when crossing the threshold downward
    if (before.available > after.lowStockThreshold && after.available <= after.lowStockThreshold) {
      const productDoc = await db.collection("products").doc(change.after.id).get();
      const product = productDoc.data();

      // Get all admin FCM tokens
      const adminSnap = await db.collection("staff")
        .where("role", "in", ["admin", "inventory_manager"])
        .get();

      const tokens = adminSnap.docs
        .map(d => d.data().fcmToken)
        .filter(Boolean);

      if (tokens.length > 0) {
        await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title: "⚠️ Low Stock Alert",
            body: `${product?.name} — only ${after.available} units left`,
          },
          data: { type: "low_stock", skuId: change.after.id },
        });
      }
    }
  });

// ═══════════════════════════════════════════════════════════════════════════════
// 7. AUTO-ASSIGN AGENT — find nearest available agent for an order
// ═══════════════════════════════════════════════════════════════════════════════
export const autoAssignAgent = functions.https.onCall(async (data, context) => {
  const { orderId } = data;

  const orderDoc = await db.collection("orders").doc(orderId).get();
  if (!orderDoc.exists) throw new functions.https.HttpsError("not-found", "Order not found");

  const order = orderDoc.data()!;
  const deliveryLat = order.deliveryAddress?.location?.lat;
  const deliveryLng = order.deliveryAddress?.location?.lng;

  // Get all available agents
  const agentsSnap = await db.collection("agents")
    .where("status", "==", "available")
    .get();

  if (agentsSnap.empty) {
    throw new functions.https.HttpsError("not-found", "No available agents");
  }

  // Find nearest agent by simple Euclidean distance (use Geohash for production)
  let nearestAgent: any = null;
  let minDistance = Infinity;

  agentsSnap.docs.forEach(doc => {
    const agent = doc.data();
    if (!agent.location) return;

    const dist = Math.sqrt(
      Math.pow(agent.location.lat - deliveryLat, 2) +
      Math.pow(agent.location.lng - deliveryLng, 2)
    );

    if (dist < minDistance) {
      minDistance = dist;
      nearestAgent = { id: doc.id, ...agent };
    }
  });

  if (!nearestAgent) throw new functions.https.HttpsError("not-found", "No agents with location data");

  // Assign agent
  await Promise.all([
    db.collection("orders").doc(orderId).update({
      agentId: nearestAgent.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }),
    db.collection("agents").doc(nearestAgent.id).update({
      status: "busy",
      activeOrderId: orderId,
    }),
  ]);

  // Notify agent
  if (nearestAgent.fcmToken) {
    await admin.messaging().send({
      token: nearestAgent.fcmToken,
      notification: { title: "New Order!", body: `Order #${orderId.slice(-6).toUpperCase()} assigned to you` },
      data: { type: "new_order", orderId },
    });
  }

  return { agentId: nearestAgent.id, agentName: nearestAgent.name };
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. SET STAFF ROLE — set Firebase custom claims for role-based access
// ═══════════════════════════════════════════════════════════════════════════════
export const setStaffRole = functions.https.onCall(async (data, context) => {
  // Only admins can set roles
  if (context.auth?.token?.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin access required");
  }

  const { uid, role } = data;
  await admin.auth().setCustomUserClaims(uid, { role });
  await db.collection("staff").doc(uid).update({ role, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

  return { success: true };
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER — send FCM push notification to user
// ═══════════════════════════════════════════════════════════════════════════════
const ORDER_MESSAGES: Record<string, { title: string; body: string }> = {
  confirmed:  { title: "✅ Order Confirmed!", body: "Your order has been confirmed and is being prepared." },
  packed:     { title: "📦 Order Packed", body: "Your order is packed and ready for pickup by our agent." },
  dispatched: { title: "🛵 Out for Delivery", body: "Your order is on the way! Track it in the app." },
  delivered:  { title: "🎉 Order Delivered!", body: "Your order has been delivered. Enjoy your groceries!" },
  cancelled:  { title: "❌ Order Cancelled", body: "Your order has been cancelled." },
  refunded:   { title: "💰 Refund Processed", body: "Your refund has been processed successfully." },
};

async function sendOrderNotification(userId: string, status: string, orderId: string) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    const fcmToken = userDoc.data()?.fcmToken;
    if (!fcmToken) return;

    const msg = ORDER_MESSAGES[status];
    if (!msg) return;

    await admin.messaging().send({
      token: fcmToken,
      notification: { title: msg.title, body: msg.body },
      data: { type: "order_update", orderId, status },
    });
  } catch (err) {
    console.error("FCM notification failed:", err);
  }
}
