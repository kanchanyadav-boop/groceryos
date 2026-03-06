// customer/app/address/index.tsx
// Full address book: list saved addresses, add new, set default, delete
import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, Modal, Platform,
} from "react-native";
import {
  doc, updateDoc, serverTimestamp, getDoc,
} from "firebase/firestore";
import * as Location from "expo-location";
import { db } from "../../src/lib/firebase";
import { useAuthStore, useAppStore } from "../../src/store";
import { COLLECTIONS } from "../../src/shared/config";
import { Address } from "../../src/shared/types";
import { router, useLocalSearchParams } from "expo-router";

const LABEL_OPTIONS = ["Home", "Work", "Other"];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function AddressScreen() {
  const { user, firebaseUid, setUser } = useAuthStore();
  const { setSelectedAddress } = useAppStore();
  const params = useLocalSearchParams<{ select?: string }>();
  const isSelectMode = params.select === "1"; // came from checkout to pick address

  const [addresses, setAddresses] = useState<Address[]>(user?.addresses || []);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Form state
  const [editId, setEditId] = useState<string | null>(null);
  const [label, setLabel] = useState("Home");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const resetForm = () => {
    setEditId(null);
    setLabel("Home");
    setLine1(""); setLine2(""); setCity(""); setPincode("");
    setLat(null); setLng(null);
  };

  const openAdd = () => { resetForm(); setShowForm(true); };

  const openEdit = (addr: Address) => {
    setEditId(addr.id);
    setLabel(addr.label);
    setLine1(addr.line1);
    setLine2(addr.line2 || "");
    setCity(addr.city);
    setPincode(addr.pincode);
    setLat(addr.location?.lat || null);
    setLng(addr.location?.lng || null);
    setShowForm(true);
  };

  const detectLocation = async () => {
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Please allow location access in settings.");
        setDetectingLocation(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);

      // Reverse geocode to fill city + pincode
      const geo = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (geo.length > 0) {
        const place = geo[0];
        if (!city) setCity(place.city || place.subregion || "");
        if (!pincode) setPincode(place.postalCode || "");
        if (!line1) setLine1([place.streetNumber, place.street].filter(Boolean).join(" "));
      }
    } catch (err) {
      Alert.alert("Error", "Could not detect location.");
    }
    setDetectingLocation(false);
  };

  const saveAddress = async () => {
    if (!line1.trim() || !city.trim() || !pincode.trim()) {
      Alert.alert("Required fields", "Please fill in address line 1, city and pincode.");
      return;
    }
    if (!firebaseUid) return;
    setSaving(true);

    try {
      let updated: Address[];

      if (editId) {
        updated = addresses.map(a =>
          a.id === editId
            ? { ...a, label, line1: line1.trim(), line2: line2.trim(), city: city.trim(), pincode: pincode.trim(), location: { lat: lat || 0, lng: lng || 0 } }
            : a
        );
      } else {
        const newAddr: Address = {
          id: generateId(),
          label,
          line1: line1.trim(),
          line2: line2.trim() || undefined,
          city: city.trim(),
          pincode: pincode.trim(),
          location: { lat: lat || 0, lng: lng || 0 },
          isDefault: addresses.length === 0, // first address = default
        };
        updated = [...addresses, newAddr];
      }

      await updateDoc(doc(db, COLLECTIONS.USERS, firebaseUid), {
        addresses: updated,
        updatedAt: serverTimestamp(),
      });

      setAddresses(updated);
      setUser({ ...user!, addresses: updated }, firebaseUid);
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setSaving(false);
  };

  const deleteAddress = (id: string) => {
    Alert.alert("Delete address?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          if (!firebaseUid) return;
          const updated = addresses.filter(a => a.id !== id);
          // if deleted was default, make first one default
          if (updated.length > 0 && !updated.some(a => a.isDefault)) {
            updated[0].isDefault = true;
          }
          await updateDoc(doc(db, COLLECTIONS.USERS, firebaseUid), {
            addresses: updated, updatedAt: serverTimestamp(),
          });
          setAddresses(updated);
          setUser({ ...user!, addresses: updated }, firebaseUid);
        },
      },
    ]);
  };

  const setDefault = async (id: string) => {
    if (!firebaseUid) return;
    const updated = addresses.map(a => ({ ...a, isDefault: a.id === id }));
    await updateDoc(doc(db, COLLECTIONS.USERS, firebaseUid), {
      addresses: updated, updatedAt: serverTimestamp(),
    });
    setAddresses(updated);
    setUser({ ...user!, addresses: updated }, firebaseUid);
  };

  const handleSelect = (addr: Address) => {
    if (isSelectMode) {
      setSelectedAddress(addr);
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isSelectMode ? "Select Address" : "My Addresses"}</Text>
        <TouchableOpacity onPress={openAdd}>
          <Text style={styles.addLink}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {addresses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📍</Text>
            <Text style={styles.emptyTitle}>No saved addresses</Text>
            <Text style={styles.emptySubtitle}>Add your home or work address for faster checkout</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
              <Text style={styles.addBtnText}>+ Add Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          addresses.map(addr => (
            <TouchableOpacity
              key={addr.id}
              style={[styles.card, addr.isDefault && styles.cardDefault, isSelectMode && styles.cardSelectable]}
              onPress={() => handleSelect(addr)}
              activeOpacity={isSelectMode ? 0.7 : 1}
            >
              <View style={styles.cardTop}>
                <View style={styles.labelRow}>
                  <Text style={styles.labelEmoji}>
                    {addr.label === "Home" ? "🏠" : addr.label === "Work" ? "🏢" : "📍"}
                  </Text>
                  <Text style={styles.labelText}>{addr.label}</Text>
                  {addr.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
                {!isSelectMode && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEdit(addr)} style={styles.actionBtn}>
                      <Text style={styles.actionEdit}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteAddress(addr.id)} style={styles.actionBtn}>
                      <Text style={styles.actionDelete}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <Text style={styles.addressLine}>{addr.line1}</Text>
              {addr.line2 ? <Text style={styles.addressLine}>{addr.line2}</Text> : null}
              <Text style={styles.addressCity}>{addr.city} — {addr.pincode}</Text>

              {!addr.isDefault && !isSelectMode && (
                <TouchableOpacity onPress={() => setDefault(addr.id)} style={styles.setDefaultBtn}>
                  <Text style={styles.setDefaultText}>Set as default</Text>
                </TouchableOpacity>
              )}

              {isSelectMode && (
                <View style={styles.selectHint}>
                  <Text style={styles.selectHintText}>Tap to deliver here →</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editId ? "Edit Address" : "New Address"}</Text>
            <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
            {/* Label */}
            <Text style={styles.fieldLabel}>Address Label</Text>
            <View style={styles.labelOptions}>
              {LABEL_OPTIONS.map(l => (
                <TouchableOpacity
                  key={l}
                  style={[styles.labelOption, label === l && styles.labelOptionActive]}
                  onPress={() => setLabel(l)}
                >
                  <Text style={[styles.labelOptionText, label === l && styles.labelOptionTextActive]}>
                    {l === "Home" ? "🏠 Home" : l === "Work" ? "🏢 Work" : "📍 Other"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* GPS Detect */}
            <TouchableOpacity style={styles.gpsBtn} onPress={detectLocation} disabled={detectingLocation}>
              {detectingLocation
                ? <ActivityIndicator color="#2ECC71" size="small" />
                : <Text style={styles.gpsBtnText}>📡 Use Current Location</Text>
              }
            </TouchableOpacity>
            {lat !== null && (
              <Text style={styles.gpsConfirm}>✓ Location captured ({lat.toFixed(4)}, {lng?.toFixed(4)})</Text>
            )}

            <Text style={styles.fieldLabel}>Address Line 1 *</Text>
            <TextInput
              style={styles.input}
              value={line1}
              onChangeText={setLine1}
              placeholder="House / Flat no., Street name"
              placeholderTextColor="#4E4E60"
            />

            <Text style={styles.fieldLabel}>Address Line 2</Text>
            <TextInput
              style={styles.input}
              value={line2}
              onChangeText={setLine2}
              placeholder="Landmark, Society name (optional)"
              placeholderTextColor="#4E4E60"
            />

            <View style={styles.row}>
              <View style={styles.rowHalf}>
                <Text style={styles.fieldLabel}>City *</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Mumbai"
                  placeholderTextColor="#4E4E60"
                />
              </View>
              <View style={styles.rowHalf}>
                <Text style={styles.fieldLabel}>Pincode *</Text>
                <TextInput
                  style={styles.input}
                  value={pincode}
                  onChangeText={setPincode}
                  placeholder="400001"
                  placeholderTextColor="#4E4E60"
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={saveAddress}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.saveBtnText}>{editId ? "Update Address" : "Save Address"}</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  back: { color: "#fff", fontSize: 22, width: 32 },
  title: { color: "#fff", fontWeight: "900", fontSize: 20 },
  addLink: { color: "#2ECC71", fontWeight: "700", fontSize: 15 },
  list: { padding: 16, paddingBottom: 60 },

  empty: { alignItems: "center", paddingTop: 80 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { color: "#fff", fontWeight: "800", fontSize: 18, marginBottom: 8 },
  emptySubtitle: { color: "#8A8A9A", fontSize: 13, textAlign: "center", marginBottom: 28, paddingHorizontal: 20 },
  addBtn: { backgroundColor: "#2ECC71", borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  addBtnText: { color: "#000", fontWeight: "900", fontSize: 15 },

  card: { backgroundColor: "#16181F", borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#262830" },
  cardDefault: { borderColor: "#2ECC7150" },
  cardSelectable: { borderColor: "#262830" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  labelEmoji: { fontSize: 16 },
  labelText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  defaultBadge: { backgroundColor: "#2ECC7120", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: "#2ECC7140" },
  defaultBadgeText: { color: "#2ECC71", fontSize: 10, fontWeight: "700" },
  cardActions: { flexDirection: "row", gap: 12 },
  actionBtn: { padding: 4 },
  actionEdit: { color: "#60A5FA", fontSize: 13, fontWeight: "600" },
  actionDelete: { color: "#E05252", fontSize: 13, fontWeight: "600" },
  addressLine: { color: "#F0F0F5", fontSize: 14, marginBottom: 2 },
  addressCity: { color: "#8A8A9A", fontSize: 13, marginTop: 3 },
  setDefaultBtn: { marginTop: 12, borderTopWidth: 1, borderTopColor: "#262830", paddingTop: 10 },
  setDefaultText: { color: "#2ECC71", fontSize: 13, fontWeight: "600" },
  selectHint: { marginTop: 10, borderTopWidth: 1, borderTopColor: "#262830", paddingTop: 8 },
  selectHintText: { color: "#2ECC71", fontSize: 12, fontWeight: "600" },

  // Modal
  modal: { flex: 1, backgroundColor: "#0F1117" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: "#262830" },
  modalTitle: { color: "#fff", fontWeight: "900", fontSize: 20 },
  modalClose: { color: "#8A8A9A", fontSize: 22, padding: 4 },
  form: { padding: 20, gap: 4, paddingBottom: 60 },
  fieldLabel: { color: "#7A7A8E", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  labelOptions: { flexDirection: "row", gap: 8 },
  labelOption: { flex: 1, paddingVertical: 10, backgroundColor: "#1E2028", borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#262830" },
  labelOptionActive: { backgroundColor: "#2ECC7120", borderColor: "#2ECC71" },
  labelOptionText: { color: "#8A8A9A", fontSize: 13, fontWeight: "600" },
  labelOptionTextActive: { color: "#2ECC71" },
  gpsBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#2ECC7115", borderWidth: 1, borderColor: "#2ECC7140", borderRadius: 12, paddingVertical: 12, marginTop: 8 },
  gpsBtnText: { color: "#2ECC71", fontWeight: "700", fontSize: 14 },
  gpsConfirm: { color: "#2ECC71", fontSize: 12, marginTop: 4 },
  input: { backgroundColor: "#1E2028", borderWidth: 1, borderColor: "#262830", borderRadius: 12, paddingHorizontal: 14, height: 50, color: "#fff", fontSize: 15 },
  row: { flexDirection: "row", gap: 12 },
  rowHalf: { flex: 1 },
  saveBtn: { backgroundColor: "#2ECC71", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#000", fontWeight: "900", fontSize: 16 },
});
