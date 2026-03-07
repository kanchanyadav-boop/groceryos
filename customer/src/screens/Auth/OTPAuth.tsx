// customer/src/screens/Auth/OTPAuth.tsx
// ─── Phone-only Login ────────────────────────────────────────────────────────
// User enters their mobile number and taps "Continue" — no OTP required.
// The app signs in anonymously (for Firebase Auth context needed by Cloud
// Functions) and creates/finds the user profile doc keyed by phone number.

import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { COLLECTIONS } from "../../shared/config";
import { useAuthStore, useLoaderStore, useCartStore } from "../../store";
import { User } from "../../shared/types";
import { router } from "expo-router";

export default function OTPAuth() {
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [loading, setLoading] = useState(false);

  const { setUser } = useAuthStore();
  const { showLoader, hideLoader } = useLoaderStore();

  const digits = phone.replace(/\D/g, "");
  const normalized = `+91${digits}`;

  const handleContinue = async () => {
    if (digits.length !== 10) {
      setPhoneError("Enter a valid 10-digit mobile number");
      return;
    }
    setPhoneError("");
    setLoading(true);
    showLoader("Signing in…");

    try {
      // 1. Sign in anonymously — gives us a Firebase Auth UID so Cloud
      //    Functions receive a valid `context.auth` on every call.
      const cred = await signInAnonymously(auth);
      const firebaseUid = cred.user.uid;

      // 2. Use the normalised phone number (without "+") as the stable
      //    Firestore document ID. This is the canonical user identity.
      const phoneDocId = normalized.replace("+", "").replace(/\s/g, "");
      const userRef = doc(db, COLLECTIONS.USERS, phoneDocId);
      const snap = await getDoc(userRef);

      let userProfile: User;

      if (snap.exists()) {
        // Returning customer — update last login
        userProfile = { id: snap.id, ...snap.data() } as User;
        await setDoc(
          userRef,
          { lastLoginAt: serverTimestamp(), firebaseUid },
          { merge: true }
        );
      } else {
        // New customer — create profile stub
        userProfile = {
          id: phoneDocId,
          name: "",
          phone: normalized,
          addresses: [],
          createdAt: new Date().toISOString(),
        };
        await setDoc(userRef, {
          ...userProfile,
          firebaseUid,
          createdAt: serverTimestamp(),
        });
      }

      // 3. Persist to Zustand + clear any stale cart from a previous session
      setUser(userProfile, firebaseUid);
      useCartStore.getState().clearCart();

      // 4. Navigate — new users go to onboarding (to enter their name),
      //    returning users go straight to home.
      router.replace(userProfile.name ? "/(tabs)/home" : "/(auth)/onboarding");
    } catch (err: any) {
      console.error("[login]", err);
      Alert.alert("Login failed", err.message || "Please try again.");
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🛒</Text>
        <Text style={styles.title}>Green's Supermarket</Text>
        <Text style={styles.subtitle}>Fresh groceries delivered to your door</Text>

        <Text style={styles.label}>Mobile Number</Text>
        <View style={styles.phoneRow}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>+91</Text>
          </View>
          <TextInput
            style={[styles.phoneInput, phoneError ? styles.inputError : null]}
            value={phone}
            onChangeText={t => { setPhone(t); if (phoneError) setPhoneError(""); }}
            placeholder="9876543210"
            placeholderTextColor="#4E4E60"
            keyboardType="phone-pad"
            maxLength={10}
            editable={!loading}
          />
        </View>
        {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#000" size="small" />
            : <Text style={styles.btnText}>Continue →</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/(tabs)/home")} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now, just browse products →</Text>
        </TouchableOpacity>

        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },
  inner: { flex: 1, padding: 28, justifyContent: "center" },
  logo: { fontSize: 48, textAlign: "center", marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "900", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#8A8A9A", textAlign: "center", marginBottom: 40 },
  label: { color: "#7A7A8E", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  phoneRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  countryCode: {
    width: 56, backgroundColor: "#1E2028", borderWidth: 1, borderColor: "#262830",
    borderRadius: 14, alignItems: "center", justifyContent: "center",
  },
  countryCodeText: { color: "#7A7A8E", fontWeight: "700", fontSize: 14 },
  phoneInput: {
    flex: 1, backgroundColor: "#1E2028", borderWidth: 1, borderColor: "#262830",
    borderRadius: 14, paddingHorizontal: 16, height: 52, color: "#fff", fontSize: 18, letterSpacing: 2,
  },
  inputError: { borderColor: "#E05252" },
  btn: {
    backgroundColor: "#2ECC71", borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center", marginTop: 16, marginBottom: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#000", fontWeight: "900", fontSize: 16 },
  errorText: { color: "#E05252", fontSize: 12, marginBottom: 8, marginTop: 2 },
  skipBtn: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  skipText: { color: "#8A8A9A", fontSize: 14, fontWeight: "500" },
  terms: { color: "#3D3D50", fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 16 },
});
