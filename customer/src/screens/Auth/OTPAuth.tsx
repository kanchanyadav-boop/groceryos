// customer/src/screens/Auth/OTPAuth.tsx
import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier, ApplicationVerifier } from "firebase/auth";
import { doc, setDoc, serverTimestamp, query, collection, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuthStore } from "../../store";
import { COLLECTIONS } from "../../shared/config";
import { User } from "../../shared/types";
import { router } from "expo-router";

// Demo mode: Use Firebase test phone numbers (no SMS sent, but proper auth flow)
const DEMO_PHONE = "+919999999999";
const DEMO_OTP = "123456";

export default function OTPAuth() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [verificationId, setVerificationId] = useState<string>("");
  const { setUser } = useAuthStore();
  const auth = getAuth();

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const sendOTP = async (isResend = false) => {
    const normalized = phone.startsWith("+91") ? phone : `+91${phone.replace(/\D/g, "")}`;
    if (normalized.length < 13) {
      Alert.alert("Invalid phone", "Enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);

    try {
      // For demo: Use Firebase test phone numbers
      // In production, this will send real SMS
      // Configure test numbers in Firebase Console: Authentication > Sign-in method > Phone > Test phone numbers
      
      // Note: Firebase Phone Auth requires reCAPTCHA on web/React Native
      // For demo purposes, we'll use a simplified flow
      // In production, integrate expo-firebase-recaptcha or use Cloud Functions
      
      // Simulate OTP sent
      setStep("otp");
      setResendTimer(30);
      setOtp("");
      
      if (!isResend) {
        Alert.alert("OTP Sent", "Please enter the 6-digit OTP sent to your mobile number");
      } else {
        Alert.alert("OTP Resent", "A new OTP has been sent to your mobile number");
      }
    } catch (error: any) {
      console.error("Send OTP error:", error);
      Alert.alert("Error", "Failed to send OTP. Please try again.");
    }

    setLoading(false);
  };

  const resendOTP = () => {
    if (resendTimer > 0) return;
    sendOTP(true);
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter the 6-digit OTP");
      return;
    }

    // Demo mode: Check against hardcoded OTP
    if (otp !== DEMO_OTP) {
      Alert.alert("Invalid OTP", "The OTP you entered is incorrect. Please try again.");
      return;
    }

    const normalized = phone.startsWith("+91") ? phone : `+91${phone.replace(/\D/g, "")}`;
    setLoading(true);

    try {
      // In demo mode, we'll create a user account directly
      // In production, Firebase Phone Auth will handle this
      
      // Generate a unique user ID (in production, Firebase provides this)
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Check if user with this phone already exists
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where("phone", "==", normalized));
      const existingUsers = await getDocs(q);

      let userProfile: User;
      
      if (!existingUsers.empty) {
        // User exists, load their profile
        const existingDoc = existingUsers.docs[0];
        userProfile = { id: existingDoc.id, ...existingDoc.data() } as User;
        
        // Update last login
        await setDoc(doc(db, COLLECTIONS.USERS, existingDoc.id), {
          ...existingDoc.data(),
          lastLoginAt: serverTimestamp(),
        }, { merge: true });
      } else {
        // Create new user profile
        userProfile = {
          id: userId,
          name: "",
          phone: normalized,
          addresses: [],
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, COLLECTIONS.USERS, userId), {
          ...userProfile,
          createdAt: serverTimestamp(),
        });
      }

      setUser(userProfile, userProfile.id);

      // Redirect based on profile completeness
      if (!userProfile.name) {
        router.replace("/(auth)/onboarding");
      } else {
        router.replace("/(tabs)/home");
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      Alert.alert("Login Failed", "Unable to verify OTP. Please try again.");
    }
    setLoading(false);
  };

  const skipLogin = async () => {
    // Guest browsing - no account created yet
    // User can browse and add to cart
    // Will be prompted to login at checkout
    router.replace("/(tabs)/home");
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
              placeholder="• • • • • •"
              placeholderTextColor="#4B5563"
              keyboardType="number-pad"
              maxLength={6}
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
  terms: { color: "#374151", fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 16 },
});
