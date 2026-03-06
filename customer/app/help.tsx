// customer/app/help.tsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { router } from "expo-router";

export default function HelpScreen() {
  const faqs = [
    {
      q: "How do I place an order?",
      a: "Browse products, add them to cart, select delivery address and time slot, then proceed to checkout."
    },
    {
      q: "What are the delivery charges?",
      a: "₹30 for orders below ₹500. Free delivery for orders above ₹500."
    },
    {
      q: "What payment methods do you accept?",
      a: "We accept UPI, Credit/Debit Cards, Wallets, and Cash on Delivery."
    },
    {
      q: "Can I cancel my order?",
      a: "Yes, you can cancel before the order is packed. Go to My Orders and select Cancel."
    },
    {
      q: "How do I track my order?",
      a: "Go to My Orders and click on your order to see real-time tracking."
    },
    {
      q: "What is your refund policy?",
      a: "Full refund for damaged/wrong items. Refunds processed within 5-7 business days."
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contact Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          
          <TouchableOpacity 
            style={styles.contactCard}
            onPress={() => Linking.openURL('tel:+919999999999')}
          >
            <View style={styles.contactIcon}>
              <Text style={styles.contactIconText}>📞</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Call Us</Text>
              <Text style={styles.contactValue}>+91 9999 999 999</Text>
              <Text style={styles.contactHint}>Mon-Sun, 9 AM - 9 PM</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactCard}
            onPress={() => Linking.openURL('mailto:support@greenssupermarket.com')}
          >
            <View style={styles.contactIcon}>
              <Text style={styles.contactIconText}>✉️</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email Us</Text>
              <Text style={styles.contactValue}>support@greenssupermarket.com</Text>
              <Text style={styles.contactHint}>We'll respond within 24 hours</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactCard}
            onPress={() => Linking.openURL('https://wa.me/919999999999')}
          >
            <View style={styles.contactIcon}>
              <Text style={styles.contactIconText}>💬</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>WhatsApp</Text>
              <Text style={styles.contactValue}>Chat with us</Text>
              <Text style={styles.contactHint}>Quick responses</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq, index) => (
            <View key={index} style={styles.faqCard}>
              <Text style={styles.faqQuestion}>{faq.q}</Text>
              <Text style={styles.faqAnswer}>{faq.a}</Text>
            </View>
          ))}
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
  sectionTitle: { color: "#9CA3AF", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 },
  contactCard: { flexDirection: "row", backgroundColor: "#0C1220", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#1C2A3E" },
  contactIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#10B98120", alignItems: "center", justifyContent: "center", marginRight: 16 },
  contactIconText: { fontSize: 24 },
  contactInfo: { flex: 1 },
  contactLabel: { color: "#9CA3AF", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  contactValue: { color: "#10B981", fontSize: 16, fontWeight: "700", marginTop: 4 },
  contactHint: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  faqCard: { backgroundColor: "#0C1220", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#1C2A3E" },
  faqQuestion: { color: "#E8EDF8", fontSize: 15, fontWeight: "700", marginBottom: 8 },
  faqAnswer: { color: "#9CA3AF", fontSize: 14, lineHeight: 20 },
});
