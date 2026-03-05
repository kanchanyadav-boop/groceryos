// customer/src/screens/Auth/OTPAuth.tsx
import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { getAuth, signInAnonymously } from "firebase/auth";
import { doc, setDoc, serverTimestamp, query, collection, where, getDocs } from "firebase/firestore";
import * as SMS from "expo-sms";
import { db } from "../../lib/firebase";
import { useAuthStore } from "../../store";
import { COLLECTIONS } from "../../shared/config";
import { User } from "../../shared/types";
import { router } from "expo-router";

const UAT_OTP = "1234"; // Hardcoded OTP for UAT testing
const RESEND_TIMEOUT = 30; // seconds

export default function OTPAuth() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const { setUser } = useAuthStore();
  const auth = getAuth();

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Auto-read SMS on Android (using SMS User Consent API)
  useEffect(() => {
    if (step === "otp" && Platform.OS === "android") {
      startSMSListener();
    }
  }, [step]);

  const startSMSListener = async () => {
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        // Note: SMS auto-read requires the SMS to contain a specific hash code
        // For UAT, we'll just show a hint. In production, integrate with SMS Retriever API
        console.log("SMS listener ready for auto-read");
      }
    } catch (error) {
      console.log("SMS auto-read not available:", error);
    }
  };

  const sendOTP = async (isResend = false) => {
    const normalized = phone.startsWith("+91") ? phone : `+91${phone.replace(/\D/g, "")}`;
    if (normalized.length < 13) {
      Alert.alert("Invalid phone", "Enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);

    try {
      // TODO: Replace with actual OTP API call (MSG91, Twilio, etc.)
      // Example:
      // const response = await fetch('YOUR_OTP_API_ENDPOINT', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phone: normalized })
      // });
      // const data = await response.json();

      // For UAT: Just move to OTP step (no actual SMS sent)
      setStep("otp");
      setResendTimer(RESEND_TIMEOUT);
      setOtp(""); // Clear previous OTP
      
      if (isResend) {
        Alert.alert("OTP Resent", `UAT Mode: Use OTP ${UAT_OTP} to login`);
      } else {
        Alert.alert("OTP Sent", `UAT Mode: Use OTP ${UAT_OTP} to login`);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send OTP");
    }

    setLoading(false);
  };

  const resendOTP = () => {
    if (resendTimer > 0) return;
    sendOTP(true);
  };

  const verifyOTP = async () => {
    if (otp.length !== 4) {
      Alert.alert("Invalid OTP", "Enter the 4-digit OTP");
      return;
    }

    // Check hardcoded OTP for UAT
    if (otp !== UAT_OTP) {
      Alert.alert("Invalid OTP", `Incorrect OTP. Use ${UAT_OTP} for UAT testing.`);
      return;
    }

    const normalized = phone.startsWith("+91") ? phone : `+91${phone.replace(/\D/g, "")}`;
    await loginUser(normalized);
  };

  const skipLogin = async () => {
    // Guest browsing mode - sign in anonymously without phone number
    await loginUser(undefined, true);
  };

  const loginUser = async (phoneNumber?: string, isGuest = false) => {
    setLoading(true);

    try {
      // Sign in anonymously (temporary for UAT testing)
      const result = await signInAnonymously(auth);
      const firebaseUser = result.user;

      let userProfile: User;

      if (phoneNumber) {
        // Check if user with this phone already exists
        const usersRef = collection(db, COLLECTIONS.USERS);
        const q = query(usersRef, where("phone", "==", phoneNumber));
        const existingUsers = await getDocs(q);
        
        if (!existingUsers.empty) {
          // User exists, load their profile
          const existingDoc = existingUsers.docs[0];
          userProfile = { id: existingDoc.id, ...existingDoc.data() } as User;
          
          // Update the user document with new auth UID
          await setDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid), {
            ...existingDoc.data(),
            updatedAt: serverTimestamp(),
          });
        } else {
          // Create new user profile
          userProfile = {
            id: firebaseUser.uid,
            name: "",
            phone: phoneNumber,
            addresses: [],
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid), {
            ...userProfile,
            createdAt: serverTimestamp(),
          });
        }
      } else {
        // Guest user - minimal profile
        userProfile = {
          id: firebaseUser.uid,
          name: "Guest",
          phone: "",
          addresses: [],
          createdAt: new Date().toISOString(),
          isGuest: true,
        };
        await setDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid), {
          ...userProfile,
          createdAt: serverTimestamp(),
        });
      }

      setUser(userProfile, firebaseUser.uid);

      // Guest users go directly to home, others to onboarding if incomplete
      if (isGuest || userProfile.name) {
        router.replace("/(tabs)/home");
      } else {
        router.replace("/(auth)/onboarding");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      Alert.alert("Login Failed", err.message || "Unable to sign in. Please try again.");
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.logo}>🛒</Text>
        <Text style={styles.title}>Green's Supermarket</Text>
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
            <TouchableOpacity style={styles.btn} onPress={() => sendOTP(false)} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Send OTP</Text>}
            </TouchableOpacity>

            <View style={styles.uatBanner}>
              <Text style={styles.uatText}>⚠️ UAT Mode: OTP will be {UAT_OTP}</Text>
            </View>

            <TouchableOpacity onPress={skipLogin} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip for now, just browse products →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Enter OTP sent to +91{phone}</Text>
            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={setOtp}
              placeholder="• • • •"
              placeholderTextColor="#4B5563"
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
            />
            <TouchableOpacity style={styles.btn} onPress={verifyOTP} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Verify & Login</Text>}
            </TouchableOpacity>
            
            <View style={styles.resendRow}>
              <TouchableOpacity onPress={() => setStep("phone")} style={styles.backBtn}>
                <Text style={styles.backText}>← Change number</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={resendOTP} 
                disabled={resendTimer > 0}
                style={styles.resendBtn}
              >
                <Text style={[styles.resendText, resendTimer > 0 && styles.resendDisabled]}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.uatBanner}>
              <Text style={styles.uatText}>💡 Hint: Use OTP {UAT_OTP}</Text>
              {Platform.OS === "android" && (
                <Text style={styles.uatTextSmall}>SMS auto-read enabled for production</Text>
              )}
            </View>
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
  resendRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: { paddingVertical: 8 },
  backText: { color: "#6B7280", fontSize: 14 },
  resendBtn: { paddingVertical: 8 },
  resendText: { color: "#10B981", fontSize: 14, fontWeight: "600" },
  resendDisabled: { color: "#4B5563" },
  skipBtn: { 
    alignItems: "center", 
    paddingVertical: 12, 
    marginTop: 8,
  },
  skipText: { 
    color: "#6B7280", 
    fontSize: 14, 
    fontWeight: "500",
  },
  uatBanner: {
    backgroundColor: "#FEF3C7", borderRadius: 12, padding: 12, marginTop: 8,
  },
  uatText: { color: "#92400E", fontSize: 12, textAlign: "center", fontWeight: "600" },
  uatTextSmall: { color: "#92400E", fontSize: 10, textAlign: "center", marginTop: 4 },
  terms: { color: "#374151", fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 16 },
});
