// agent/app/(auth)/login.tsx
import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../src/lib/firebase";
import { COLLECTIONS } from "../../../shared/config";
import { router } from "expo-router";

export default function AgentLogin() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  const sendOTP = async () => {
    const normalized = phone.startsWith("+91") ? phone : `+91${phone.replace(/\D/g, "")}`;
    if (normalized.length < 13) {
      Alert.alert("Invalid number", "Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithPhoneNumber(auth, normalized);
      setConfirmation(result);
      setStep("otp");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send OTP. Try again.");
    }
    setLoading(false);
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Enter the 6-digit OTP sent to your number.");
      return;
    }
    setLoading(true);
    try {
      const result = await confirmation!.confirm(otp);
      const firebaseUser = result.user;

      // Verify this UID is a registered agent
      const agentDoc = await getDoc(doc(db, COLLECTIONS.AGENTS, firebaseUser.uid));
      if (!agentDoc.exists()) {
        await auth.signOut();
        Alert.alert(
          "Not registered",
          "This number is not registered as a delivery agent. Contact your manager.",
        );
        setLoading(false);
        return;
      }

      router.replace("/home");
    } catch (err: any) {
      Alert.alert("Wrong OTP", "The OTP you entered is incorrect. Please try again.");
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <Text style={styles.logo}>🛵</Text>
        <Text style={styles.title}>GroceryOS Delivery</Text>
        <Text style={styles.subtitle}>Agent portal — login with your registered mobile number</Text>

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

            <TouchableOpacity
              style={[styles.btn, (loading || phone.length < 10) && styles.btnDisabled]}
              onPress={sendOTP}
              disabled={loading || phone.length < 10}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.btnText}>Send OTP</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Enter OTP sent to +91 {phone}</Text>
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

            <TouchableOpacity
              style={[styles.btn, (loading || otp.length !== 6) && styles.btnDisabled]}
              onPress={verifyOTP}
              disabled={loading || otp.length !== 6}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.btnText}>Verify & Login</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setStep("phone"); setOtp(""); }}
              style={styles.backBtn}
            >
              <Text style={styles.backText}>← Change number</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.helpText}>
          Not registered? Contact your manager to get added as an agent.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060A12" },
  inner: { flex: 1, padding: 28, justifyContent: "center" },
  logo: { fontSize: 52, textAlign: "center", marginBottom: 12 },
  title: { fontSize: 26, fontWeight: "900", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#6B7280", textAlign: "center", marginBottom: 40, lineHeight: 20 },
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
  btnDisabled: { opacity: 0.45 },
  btnText: { color: "#000", fontWeight: "900", fontSize: 15 },
  backBtn: { alignItems: "center", paddingVertical: 8 },
  backText: { color: "#6B7280", fontSize: 14 },
  helpText: { color: "#374151", fontSize: 12, textAlign: "center", marginTop: 32, lineHeight: 18 },
});
