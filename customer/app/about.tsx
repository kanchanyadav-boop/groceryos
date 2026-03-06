// customer/app/about.tsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { router } from "expo-router";

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Us</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.logo}>🛒</Text>
          <Text style={styles.brandName}>Green's Supermarket</Text>
          <Text style={styles.tagline}>Fresh groceries delivered to your doorstep</Text>
        </View>

        {/* Our Story */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Story</Text>
          <View style={styles.card}>
            <Text style={styles.cardText}>
              Founded in 2024, Green's Supermarket was born from a simple idea: make grocery shopping convenient, affordable, and reliable for everyone.
            </Text>
            <Text style={styles.cardText}>
              We started with a mission to bring fresh produce and quality groceries directly to your home, saving you time and ensuring you get the best products at competitive prices.
            </Text>
          </View>
        </View>

        {/* Our Values */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What We Stand For</Text>
          
          <View style={styles.valueCard}>
            <Text style={styles.valueIcon}>🌱</Text>
            <View style={styles.valueContent}>
              <Text style={styles.valueTitle}>Freshness First</Text>
              <Text style={styles.valueText}>We source directly from farms and trusted suppliers to ensure maximum freshness</Text>
            </View>
          </View>

          <View style={styles.valueCard}>
            <Text style={styles.valueIcon}>💰</Text>
            <View style={styles.valueContent}>
              <Text style={styles.valueTitle}>Best Prices</Text>
              <Text style={styles.valueText}>Competitive pricing with regular discounts and offers to help you save more</Text>
            </View>
          </View>

          <View style={styles.valueCard}>
            <Text style={styles.valueIcon}>⚡</Text>
            <View style={styles.valueContent}>
              <Text style={styles.valueTitle}>Fast Delivery</Text>
              <Text style={styles.valueText}>Same-day delivery with flexible time slots that fit your schedule</Text>
            </View>
          </View>

          <View style={styles.valueCard}>
            <Text style={styles.valueIcon}>✓</Text>
            <View style={styles.valueContent}>
              <Text style={styles.valueTitle}>Quality Assured</Text>
              <Text style={styles.valueText}>Every product is checked for quality before it reaches your doorstep</Text>
            </View>
          </View>
        </View>

        {/* By the Numbers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Impact</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>10K+</Text>
              <Text style={styles.statLabel}>Happy Customers</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>50K+</Text>
              <Text style={styles.statLabel}>Orders Delivered</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>2000+</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>98%</Text>
              <Text style={styles.statLabel}>Satisfaction Rate</Text>
            </View>
          </View>
        </View>

        {/* Our Promise */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Promise to You</Text>
          <View style={styles.promiseCard}>
            <Text style={styles.promiseItem}>✓ Fresh products or your money back</Text>
            <Text style={styles.promiseItem}>✓ On-time delivery guaranteed</Text>
            <Text style={styles.promiseItem}>✓ 24/7 customer support</Text>
            <Text style={styles.promiseItem}>✓ Secure and convenient payments</Text>
            <Text style={styles.promiseItem}>✓ No hidden charges</Text>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          <TouchableOpacity 
            style={styles.contactCard}
            onPress={() => Linking.openURL('tel:+919999999999')}
          >
            <Text style={styles.contactIcon}>📞</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>+91 9999 999 999</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactCard}
            onPress={() => Linking.openURL('mailto:support@greenssupermarket.com')}
          >
            <Text style={styles.contactIcon}>✉️</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>support@greenssupermarket.com</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.contactCard}>
            <Text style={styles.contactIcon}>📍</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Address</Text>
              <Text style={styles.contactValue}>Green's Supermarket HQ{"\n"}Mumbai, Maharashtra, India</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2024-2026 Green's Supermarket</Text>
          <Text style={styles.footerText}>All rights reserved</Text>
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
  heroSection: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 },
  logo: { fontSize: 64, marginBottom: 16 },
  brandName: { color: "#fff", fontSize: 28, fontWeight: "900", marginBottom: 8 },
  tagline: { color: "#10B981", fontSize: 14, fontWeight: "600" },
  section: { padding: 20 },
  sectionTitle: { color: "#9CA3AF", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 },
  card: { backgroundColor: "#0C1220", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#1C2A3E" },
  cardText: { color: "#9CA3AF", fontSize: 14, lineHeight: 22, marginBottom: 12 },
  valueCard: { flexDirection: "row", backgroundColor: "#0C1220", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#1C2A3E" },
  valueIcon: { fontSize: 32, marginRight: 16 },
  valueContent: { flex: 1 },
  valueTitle: { color: "#E8EDF8", fontSize: 15, fontWeight: "700", marginBottom: 4 },
  valueText: { color: "#9CA3AF", fontSize: 13, lineHeight: 20 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { flex: 1, minWidth: "45%", backgroundColor: "#0C1220", borderRadius: 16, padding: 20, alignItems: "center", borderWidth: 1, borderColor: "#1C2A3E" },
  statNumber: { color: "#10B981", fontSize: 28, fontWeight: "900", marginBottom: 4 },
  statLabel: { color: "#9CA3AF", fontSize: 12, textAlign: "center" },
  promiseCard: { backgroundColor: "#10B98120", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#10B981" },
  promiseItem: { color: "#E8EDF8", fontSize: 14, lineHeight: 28, fontWeight: "600" },
  contactCard: { flexDirection: "row", backgroundColor: "#0C1220", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#1C2A3E" },
  contactIcon: { fontSize: 24, marginRight: 16 },
  contactInfo: { flex: 1 },
  contactLabel: { color: "#9CA3AF", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  contactValue: { color: "#E8EDF8", fontSize: 14, fontWeight: "600", marginTop: 4, lineHeight: 20 },
  footer: { padding: 20, alignItems: "center", paddingBottom: 40 },
  footerText: { color: "#4B5563", fontSize: 12, lineHeight: 20 },
});
