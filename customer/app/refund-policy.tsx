// customer/app/refund-policy.tsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function RefundPolicyScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refund Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.intro}>
            At Green's Supermarket, we are committed to your satisfaction. If you're not completely happy with your purchase, we're here to help.
          </Text>
        </View>

        {/* Refund Eligibility */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Refund Eligibility</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>✓ Eligible for Refund</Text>
            <Text style={styles.cardText}>• Damaged or spoiled products</Text>
            <Text style={styles.cardText}>• Wrong items delivered</Text>
            <Text style={styles.cardText}>• Missing items from order</Text>
            <Text style={styles.cardText}>• Quality issues with fresh produce</Text>
            <Text style={styles.cardText}>• Expired products delivered</Text>
          </View>

          <View style={[styles.card, styles.cardDanger]}>
            <Text style={styles.cardTitle}>✗ Not Eligible for Refund</Text>
            <Text style={styles.cardText}>• Change of mind after delivery</Text>
            <Text style={styles.cardText}>• Products used or consumed</Text>
            <Text style={styles.cardText}>• Packaging opened (except for inspection)</Text>
            <Text style={styles.cardText}>• Orders cancelled after packing</Text>
          </View>
        </View>

        {/* Refund Process */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Request a Refund</Text>
          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Report Issue</Text>
              <Text style={styles.stepText}>Contact us within 24 hours of delivery via app, phone, or email</Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Provide Details</Text>
              <Text style={styles.stepText}>Share photos of the issue and order details</Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Verification</Text>
              <Text style={styles.stepText}>Our team will review your request within 2-4 hours</Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Refund Processed</Text>
              <Text style={styles.stepText}>Approved refunds credited within 5-7 business days</Text>
            </View>
          </View>
        </View>

        {/* Refund Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Refund Methods</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💳 Original Payment Method</Text>
            <Text style={styles.cardText}>Refunds are processed to your original payment method (UPI, Card, Wallet)</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Store Credit</Text>
            <Text style={styles.cardText}>Instant store credit available for future orders (optional)</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔄 Replacement</Text>
            <Text style={styles.cardText}>Free replacement for damaged or wrong items</Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Refund Timeline</Text>
          <View style={styles.timelineCard}>
            <Text style={styles.timelineItem}>📱 UPI: 2-3 business days</Text>
            <Text style={styles.timelineItem}>💳 Credit/Debit Card: 5-7 business days</Text>
            <Text style={styles.timelineItem}>👛 Wallet: 1-2 business days</Text>
            <Text style={styles.timelineItem}>💵 Cash on Delivery: 7-10 business days (bank transfer)</Text>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Need Help?</Text>
          <View style={styles.contactCard}>
            <Text style={styles.contactText}>📞 Call: +91 9999 999 999</Text>
            <Text style={styles.contactText}>✉️ Email: support@greenssupermarket.com</Text>
            <Text style={styles.contactText}>💬 WhatsApp: +91 9999 999 999</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Last updated: March 2026</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060A12" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#1C2A3E" },
  backBtn: { padding: 8 },
  backText: { color: "#fff", fontSize: 28 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  content: { flex: 1 },
  section: { padding: 20 },
  intro: { color: "#9CA3AF", fontSize: 14, lineHeight: 22 },
  sectionTitle: { color: "#9CA3AF", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 },
  card: { backgroundColor: "#0C1220", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#1C2A3E" },
  cardDanger: { borderColor: "#EF444420" },
  cardTitle: { color: "#E8EDF8", fontSize: 15, fontWeight: "700", marginBottom: 12 },
  cardText: { color: "#9CA3AF", fontSize: 14, lineHeight: 22, marginBottom: 4 },
  stepCard: { flexDirection: "row", backgroundColor: "#0C1220", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#1C2A3E" },
  stepNumber: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center", marginRight: 16 },
  stepNumberText: { color: "#000", fontSize: 16, fontWeight: "900" },
  stepContent: { flex: 1 },
  stepTitle: { color: "#E8EDF8", fontSize: 15, fontWeight: "700", marginBottom: 4 },
  stepText: { color: "#9CA3AF", fontSize: 13, lineHeight: 20 },
  timelineCard: { backgroundColor: "#0C1220", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#1C2A3E" },
  timelineItem: { color: "#9CA3AF", fontSize: 14, lineHeight: 28 },
  contactCard: { backgroundColor: "#10B98120", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#10B981" },
  contactText: { color: "#10B981", fontSize: 14, lineHeight: 28, fontWeight: "600" },
  footer: { padding: 20, alignItems: "center" },
  footerText: { color: "#4B5563", fontSize: 12 },
});
