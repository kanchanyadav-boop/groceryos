// customer/src/screens/Auth/OTPAuth.tsx
// ─── Phone-only Login ────────────────────────────────────────────────────────
// Zero Cloud-Functions auth. Uses Firebase email/password with a deterministic
// credential derived from the phone number:
//   email    = "{digits}@groceryos.app"
//   password = "auth_{digits}"
//
// Firebase Auth (identitytoolkit REST API) is called directly — no CF, no IAM,
// no org-policy issues. Firebase assigns a stable UID for the email address
// that never changes. The refresh token is persisted to AsyncStorage and auto-
// renews ID tokens forever, so sessions never expire.

import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useAuthStore, useLoaderStore, useCartStore, useAppStore } from "../../store";
import { User } from "../../shared/types";
import { router } from "expo-router";
import { useTheme } from "../../hooks/useTheme";

export default function OTPAuth() {
  const { colors } = useTheme();
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [loading, setLoading] = useState(false);

  const { setUser } = useAuthStore();
  const { showLoader, hideLoader } = useLoaderStore();

  const styles = getStyles(colors);

  const digits = phone.replace(/\D/g, "");

  const handleContinue = async () => {
    if (digits.length !== 10) {
      setPhoneError("Enter a valid 10-digit mobile number");
      return;
    }
    setPhoneError("");
    setLoading(true);
    showLoader("Signing in…");

    try {
      const email = `${digits}@groceryos.app`;
      const password = `auth_${digits}`;

      // Step 1: Sign in or create Firebase Auth user — 100% client-side,
      // no Cloud Function, no IAM dependency. Firebase assigns a stable UID
      // for this email address that never changes across logins.
      let uid: string;
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        uid = cred.user.uid;
      } catch (signInErr: any) {
        if (
          signInErr.code === "auth/user-not-found" ||
          signInErr.code === "auth/invalid-credential" ||
          signInErr.code === "auth/invalid-login-credentials"
        ) {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          uid = cred.user.uid;
        } else {
          throw signInErr;
        }
      }

      // Step 2: Read or create Firestore user doc under the Firebase Auth UID.
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);

      let profileData: any;
      if (!snap.exists()) {
        profileData = {
          id: uid,
          phone: `+91${digits}`,
          name: "",
          addresses: [],
          createdAt: new Date().toISOString(),
        };
        await setDoc(userRef, profileData);
      } else {
        profileData = snap.data();
        setDoc(userRef, { lastLoginAt: new Date().toISOString() }, { merge: true });
      }

      // Step 3: Build local user object
      const userProfile: User = {
        id: uid,
        name: profileData.name || "",
        phone: `+91${digits}`,
        addresses: profileData.addresses || [],
        email: profileData.email,
        createdAt: profileData.createdAt || new Date().toISOString(),
      };

      // Step 4: Persist to Zustand + clear stale cart and address
      setUser(userProfile, uid);
      useCartStore.getState().clearCart();
      useAppStore.setState({ selectedAddress: null, selectedSlot: null });

      // Step 5: Navigate — new users → onboarding, returning → home
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
            placeholderTextColor={colors.textTertiary}
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
            ? <ActivityIndicator color={colors.bg} size="small" />
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

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, padding: 28, justifyContent: "center" },
  logo: { fontSize: 48, textAlign: "center", marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "900", color: colors.green, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 40 },
  label: { color: colors.textTertiary, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  phoneRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  countryCode: {
    width: 56, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, alignItems: "center", justifyContent: "center",
  },
  countryCodeText: { color: colors.textSecondary, fontWeight: "700", fontSize: 14 },
  phoneInput: {
    flex: 1, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 16, height: 52, color: colors.textPrimary, fontSize: 18, letterSpacing: 2,
  },
  inputError: { borderColor: colors.red },
  btn: {
    backgroundColor: colors.green, borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center", marginTop: 16, marginBottom: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.bg, fontWeight: "900", fontSize: 16 },
  errorText: { color: colors.red, fontSize: 12, marginBottom: 8, marginTop: 2 },
  skipBtn: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  skipText: { color: colors.textSecondary, fontSize: 14, fontWeight: "500" },
  terms: { color: colors.textTertiary, fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 16 },
});
