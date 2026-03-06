import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking,
} from "react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { COLLECTIONS } from "../shared/config";
import { Store } from "../shared/types";
import { router } from "expo-router";
import { useLoaderStore } from "../store";

export default function StoreLocator() {
  const [stores, setStores] = useState<Store[]>([]);
  const { showLoader, hideLoader } = useLoaderStore();

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    showLoader("Loading stores...");
    try {
      const q = query(
        collection(db, COLLECTIONS.STORES),
        where("isActive", "==", true)
      );
      const snap = await getDocs(q);
      const storeList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Store));
      setStores(storeList);
    } catch (error) {
      console.error("Error fetching stores:", error);
    } finally {
      hideLoader();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Our Stores</Text>
          <Text style={styles.headerSubtitle}>{stores.length} locations</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {stores.map((store) => (
          <View key={store.id} style={styles.storeCard}>
            <View style={styles.storeHeader}>
              <View style={styles.storeIcon}>
                <Text style={styles.storeIconText}>🏪</Text>
              </View>
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{store.name}</Text>
                <Text style={styles.storeCode}>{store.code}</Text>
              </View>
            </View>

            {/* Address */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>📍 Address</Text>
              <Text style={styles.sectionText}>
                {store.address.line1}
                {store.address.line2 && `, ${store.address.line2}`}
                {'\n'}{store.address.city}, {store.address.state} - {store.address.pincode}
              </Text>
            </View>

            {/* Contact */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>📞 Contact</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${store.phone}`)}>
                <Text style={styles.linkText}>{store.phone}</Text>
              </TouchableOpacity>
              {store.email && (
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${store.email}`)}>
                  <Text style={styles.linkText}>{store.email}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Operating Hours */}
            {store.operatingHours && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>🕐 Operating Hours</Text>
                <Text style={styles.sectionText}>
                  {store.operatingHours.open} - {store.operatingHours.close}
                </Text>
              </View>
            )}

            {/* Serviceable Pincodes */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                📮 Serviceable Pincodes ({store.serviceablePincodes.length})
              </Text>
              <View style={styles.pincodeContainer}>
                {store.serviceablePincodes.slice(0, 12).map((pin) => (
                  <View key={pin} style={styles.pincodeChip}>
                    <Text style={styles.pincodeText}>{pin}</Text>
                  </View>
                ))}
                {store.serviceablePincodes.length > 12 && (
                  <View style={styles.pincodeChip}>
                    <Text style={styles.pincodeText}>
                      +{store.serviceablePincodes.length - 12} more
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ))}

        {stores.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No stores available</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060A12" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backBtn: { padding: 8 },
  backIcon: { fontSize: 28, color: "#fff", fontWeight: "600" },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  storeCard: {
    backgroundColor: "#0C1220",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1C2A3E",
  },
  storeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1C2A3E",
  },
  storeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#10B98120",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  storeIconText: { fontSize: 24 },
  storeInfo: { flex: 1 },
  storeName: {
    color: "#E8EDF8",
    fontSize: 16,
    fontWeight: "700",
  },
  storeCode: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  section: { marginBottom: 12 },
  sectionLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  sectionText: {
    color: "#E8EDF8",
    fontSize: 14,
    lineHeight: 20,
  },
  linkText: {
    color: "#10B981",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  pincodeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pincodeChip: {
    backgroundColor: "#1C2A3E",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pincodeText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: { color: "#4B5563", fontSize: 14 },
});
