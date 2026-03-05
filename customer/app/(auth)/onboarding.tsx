// customer/app/(auth)/onboarding.tsx
import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { useAuthStore } from "../../src/store";
import { COLLECTIONS } from "../../src/shared/config";
import { router } from "expo-router";

export default function Onboarding() {
  const { user, firebaseUid, setUser } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter your name to continue.");
      return;
    }
    if (!firebaseUid) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, firebaseUid), {
        name: name.trim(),
        email: email.trim() || null,
        updatedAt: serverTimestamp(),
      });

      setUser({ ...user!, name: name.trim(), email: email.trim() || undefined }, firebaseUid);
      router.replace("/(tabs)/home");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.emoji}>👤</Text>
        <Text style={styles.title}>Almost there!</Text>
        <Text style={styles.subtitle}>Tell us your name so we can personalize your experience.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Your Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Priya Sharma"
            placeholderTextColor="#4B5563"
            autoFocus
          />

          <Text style={styles.label}>Email (optional)</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="priya@example.com"
            placeholderTextColor="#4B5563"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, (!name.trim() || loading) && styles.btnDisabled]}
          onPress={handleSave}
          disabled={!name.trim() || loading}
        >
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Start Shopping →</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060A12" },
  inner: { flex: 1, padding: 28, justifyContent: "center" },
  emoji: { fontSize: 52, textAlign: "center", marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "900", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 36, lineHeight: 20 },
  form: { gap: 16, marginBottom: 28 },
  label: { color: "#9CA3AF", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    backgroundColor: "#111827", borderWidth: 1, borderColor: "#1F2937",
    borderRadius: 14, paddingHorizontal: 16, height: 52, color: "#fff", fontSize: 16,
  },
  btn: {
    backgroundColor: "#10B981", borderRadius: 14, height: 54,
    alignItems: "center", justifyContent: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#000", fontWeight: "900", fontSize: 16 },
});
