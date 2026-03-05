// customer/src/screens/Auth/OTPAuth.tsx
import { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import {
  getAuth, PhoneAuthProvider, signInWithCredential,
  RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuthStore } from "../../store";
import { COLLECTIONS } from "../../../shared/config";
import { User } from "../../../shared/types";
import { router } from "expo-router";

export default function OTPAuth() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const { setUser } = useAuthStore();
  const auth = getAuth();

  const sendOTP = async () => {
    const normalized = phone.startsWith("+91") ? phone : `+91${phone.replace(/\D/g, "")}`;
    if (normalized.length < 13) {
      Alert.alert("Invalid phone", "Enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      // Note: On React Native, use expo-firebase-recaptcha or @firebase/auth React Native persistence
      // For Expo Go testing, use test phone numbers in Firebase console
      const confirmationResult = await signInWithPhoneNumber(auth, normalized);
      setConfirmation(confirmationResult);
      setStep("otp");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send OTP");
    }
    setLoading(false);
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const result = await confirmation!.confirm(otp);
      const firebaseUser = result.user;

      // Check if user profile exists
      const userRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
      const userDoc = await getDoc(userRef);

      let userProfile: User;
      if (userDoc.exists()) {
        userProfile = { id: firebaseUser.uid, ...userDoc.data() } as User;
      } else {
        // Create new user profile
        userProfile = {
          id: firebaseUser.uid,
          name: "",
          phone: firebaseUser.phoneNumber || phone,
          email: firebaseUser.email || undefined,
          addresses: [],
          createdAt: new Date().toISOString(),
        };
        await setDoc(userRef, {
          ...userProfile,
          createdAt: serverTimestamp(),
        });
      }

      setUser(userProfile, firebaseUser.uid);

      // Redirect based on profile completeness
      if (!userProfile.name) {
        router.replace("/onboarding");
      } else {
        router.replace("/home");
      }
    } catch (err: any) {
      Alert.alert("Invalid OTP", "The OTP you entered is incorrect");
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.logo}>🛒</Text>
        <Text style={styles.title}>GroceryOS</Text>
        <Text style={styles.subtitle}>Fresh groceries delivered to your door</Text>

        {step === "phone" ? (
          <>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="9876543210"
                placeholderTextColor="#4B5563"
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            <TouchableOpacity style={styles.btn} onPress={sendOTP} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Enter OTP sent to +91{phone}</Text>
            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={setOtp}
              placeholder="• • • • • •"
              placeholderTextColor="#4B5563"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <TouchableOpacity style={styles.btn} onPress={verifyOTP} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Verify & Login</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep("phone")} style={styles.backBtn}>
              <Text style={styles.backText}>← Change number</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060A12" },
  inner: { flex: 1, padding: 28, justifyContent: "center" },
  logo: { fontSize: 48, textAlign: "center", marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "900", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 40 },
  label: { color: "#9CA3AF", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  phoneRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  countryCode: {
    width: 56, backgroundColor: "#111827", borderWidth: 1, borderColor: "#1F2937",
    borderRadius: 14, alignItems: "center", justifyContent: "center",
  },
  countryCodeText: { color: "#9CA3AF", fontWeight: "700", fontSize: 14 },
  phoneInput: {
    flex: 1, backgroundColor: "#111827", borderWidth: 1, borderColor: "#1F2937",
    borderRadius: 14, paddingHorizontal: 16, height: 52, color: "#fff", fontSize: 18, letterSpacing: 2,
  },
  otpInput: {
    backgroundColor: "#111827", borderWidth: 1, borderColor: "#1F2937",
    borderRadius: 14, paddingHorizontal: 16, height: 62, color: "#fff",
    fontSize: 28, letterSpacing: 12, textAlign: "center", marginBottom: 16,
  },
  btn: {
    backgroundColor: "#10B981", borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  btnText: { color: "#000", fontWeight: "900", fontSize: 15 },
  backBtn: { alignItems: "center", paddingVertical: 8 },
  backText: { color: "#6B7280", fontSize: 14 },
  terms: { color: "#374151", fontSize: 11, textAlign: "center", marginTop: 32, lineHeight: 16 },
});
