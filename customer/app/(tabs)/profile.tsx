// customer/app/(tabs)/profile.tsx
import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, Switch, ActivityIndicator,
} from "react-native";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../../src/lib/firebase";
import { useAuthStore, useCartStore } from "../../src/store";
import { COLLECTIONS, APP_CONFIG } from "../../src/shared/config";
import { router } from "expo-router";

export default function ProfileTab() {
  const { user, firebaseUid, setUser, clearUser } = useAuthStore();
  const { clearCart } = useCartStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const handleSave = async () => {
    // Use user.id (stable phoneDocId) for the Firestore doc, not firebaseUid
    // (which is the anonymous Firebase UID after the auth fix — a different value).
    const docId = user?.id || firebaseUid;
    if (!docId || !name.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, docId), {
        name: name.trim(),
        email: email.trim() || null,
        updatedAt: serverTimestamp(),
      });
      setUser({ ...user!, name: name.trim(), email: email.trim() || undefined }, firebaseUid!);
      setEditing(false);
      Alert.alert("Profile updated ✓");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          await signOut(auth);
          clearUser();
          clearCart();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || "?"}</Text>
        </View>
        <Text style={styles.userName}>{user?.name || "Set your name"}</Text>
        <Text style={styles.userPhone}>{user?.phone}</Text>
      </View>

      {/* Profile Details */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          {!editing ? (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {editing ? (
          <View style={styles.editForm}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#4E4E60"
            />
            <Text style={styles.fieldLabel}>Email (optional)</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor="#4E4E60"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); setName(user?.name || ""); setEmail(user?.email || ""); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Name</Text>
              <Text style={styles.fieldValue}>{user?.name || "—"}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <Text style={styles.fieldValue}>{user?.phone || "—"}</Text>
            </View>
            <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{user?.email || "Not set"}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Quick Links */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>My Account</Text>
        {[
          { label: "📍  Saved Addresses", onPress: () => router.push("/address") },
          { label: "📦  My Orders", onPress: () => router.push("/(tabs)/orders") },
        ].map(item => (
          <TouchableOpacity key={item.label} style={styles.menuRow} onPress={item.onPress}>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>Preferences</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Order Notifications</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: "#262830", true: "#2ECC7150" }}
            thumbColor={notifications ? "#2ECC71" : "#4E4E60"}
          />
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>About</Text>
        {[
          { label: "Version", value: "1.0.0" },
          { label: "Support", value: APP_CONFIG.supportPhone },
          { label: "Email", value: APP_CONFIG.supportEmail },
        ].map(item => (
          <View key={item.label} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{item.label}</Text>
            <Text style={styles.fieldValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "900", color: "#fff" },
  avatarSection: { alignItems: "center", paddingVertical: 28 },
  avatar: { width: 72, height: 72, backgroundColor: "#2ECC7125", borderWidth: 2, borderColor: "#2ECC71", borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { color: "#2ECC71", fontSize: 30, fontWeight: "900" },
  userName: { color: "#fff", fontWeight: "900", fontSize: 20 },
  userPhone: { color: "#8A8A9A", fontSize: 13, marginTop: 4 },
  section: { marginHorizontal: 16, marginBottom: 16, backgroundColor: "#16181F", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#262830" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { color: "#7A7A8E", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  editLink: { color: "#2ECC71", fontSize: 13, fontWeight: "700" },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#262830" },
  fieldLabel: { color: "#8A8A9A", fontSize: 13 },
  fieldValue: { color: "#F0F0F5", fontSize: 13, fontWeight: "600" },
  editForm: { gap: 12 },
  input: { backgroundColor: "#1E2028", borderWidth: 1, borderColor: "#262830", borderRadius: 12, paddingHorizontal: 14, height: 48, color: "#fff", fontSize: 15 },
  editActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: "#262830", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  cancelBtnText: { color: "#7A7A8E", fontWeight: "700" },
  saveBtn: { flex: 1, backgroundColor: "#2ECC71", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  saveBtnText: { color: "#000", fontWeight: "900" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toggleLabel: { color: "#F0F0F5", fontSize: 14 },
  menuRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#262830" },
  menuLabel: { color: "#F0F0F5", fontSize: 14 },
  menuArrow: { color: "#4E4E60", fontSize: 16 },
  logoutBtn: { marginHorizontal: 16, marginTop: 4, borderWidth: 1, borderColor: "#E0525230", borderRadius: 16, paddingVertical: 16, alignItems: "center", backgroundColor: "#E0525210" },
  logoutText: { color: "#E05252", fontWeight: "700", fontSize: 15 },
});
