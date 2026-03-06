// customer/src/screens/Auth/OTPAuth.tsx
import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useAuthStore, useLoaderStore } from "../../store";
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
  const [resendTimer, setResendTimer] = useState(0);
  const [verificationId, setVerificationId] = useState<string>("");
  const [otpError, setOtpError] = useState("");
  const { setUser } = useAuthStore();
  const { showLoader, hideLoader } = useLoaderStore();

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

    showLoader(isResend ? "Resending OTP..." : "Sending OTP...");

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
    } finally {
      hideLoader();
    }
  };

  const resendOTP = () => {
    if (resendTimer > 0) return;
    sendOTP(true);
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setOtpError("Please enter the 6-digit OTP");
      return;
    }

    if (otp !== DEMO_OTP) {
      setOtpError("Incorrect OTP. Please try again.");
      return;
    }
    setOtpError("");

    const normalized = phone.startsWith("+91") ? phone : `+91${phone.replace(/\D/g, "")}`;
    showLoader("Verifying OTP...");

    try {
      // Reuse an existing persisted session, or sign in anonymously.
      // Anonymous auth satisfies Firestore rules (request.auth != null) and
      // the placeOrder Cloud Function (context.auth != null).
      // TODO: Replace with real Firebase Phone Auth for production.
      const existingUser = auth.currentUser;
      const firebaseUid = existingUser
        ? existingUser.uid
        : (await signInAnonymously(auth)).user.uid;

      // User profile document is keyed by phone-derived ID for human readability.
      const phoneDocId = normalized.replace(/\+/g, "").replace(/\s/g, "");
      const userRef = doc(db, COLLECTIONS.USERS, phoneDocId);
      const userDoc = await getDoc(userRef);

      let userProfile: User;
      if (userDoc.exists()) {
        userProfile = { id: userDoc.id, ...userDoc.data() } as User;
        await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
      } else {
        userProfile = { id: phoneDocId, name: "", phone: normalized, addresses: [] };
        await setDoc(userRef, { ...userProfile, createdAt: serverTimestamp() });
      }

      // firebaseUid = anonymous Auth UID — this is what placeOrder stores on
      // orders and what orders.tsx queries, so everything stays in sync.
      setUser(userProfile, firebaseUid);

      if (!userProfile.name) {
        router.replace("/(auth)/onboarding");
      } else {
        router.replace("/(tabs)/home");
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      Alert.alert("Login Failed", err.message || "Unable to verify OTP. Please try again.");
    } finally {
      hideLoader();
    }
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
                placeholderTextColor="#4E4E60"
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            <TouchableOpacity style={styles.btn} onPress={() => sendOTP(false)}>
              <Text style={styles.btnText}>Send OTP</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={skipLogin} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip for now, just browse products →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Enter OTP sent to +91{phone}</Text>
            <TextInput
              style={[styles.otpInput, otpError ? styles.otpInputError : null]}
              value={otp}
              onChangeText={v => { setOtp(v); if (otpError) setOtpError(""); }}
              placeholder="• • • • • •"
              placeholderTextColor="#4E4E60"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}
            <TouchableOpacity style={styles.btn} onPress={verifyOTP}>
              <Text style={styles.btnText}>Verify & Login</Text>
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
  container: { flex: 1, backgroundColor: "#0F1117" },
  inner: { flex: 1, padding: 28, justifyContent: "center" },
  logo: { fontSize: 48, textAlign: "center", marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "900", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#8A8A9A", textAlign: "center", marginBottom: 40 },
  label: { color: "#7A7A8E", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  phoneRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  countryCode: {
    width: 56, backgroundColor: "#1E2028", borderWidth: 1, borderColor: "#262830",
    borderRadius: 14, alignItems: "center", justifyContent: "center",
  },
  countryCodeText: { color: "#7A7A8E", fontWeight: "700", fontSize: 14 },
  phoneInput: {
    flex: 1, backgroundColor: "#1E2028", borderWidth: 1, borderColor: "#262830",
    borderRadius: 14, paddingHorizontal: 16, height: 52, color: "#fff", fontSize: 18, letterSpacing: 2,
  },
  otpInput: {
    backgroundColor: "#1E2028", borderWidth: 1, borderColor: "#262830",
    borderRadius: 14, paddingHorizontal: 16, height: 62, color: "#fff",
    fontSize: 28, letterSpacing: 12, textAlign: "center", marginBottom: 16,
  },
  btn: {
    backgroundColor: "#2ECC71", borderRadius: 14, height: 52,
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
  backText: { color: "#8A8A9A", fontSize: 14 },
  resendBtn: { paddingVertical: 8 },
  resendText: { color: "#2ECC71", fontSize: 14, fontWeight: "600" },
  resendDisabled: { color: "#4E4E60" },
  otpInputError: { borderColor: "#E05252" },
  errorText: { color: "#E05252", fontSize: 12, marginBottom: 12, marginTop: -8 },
  skipBtn: { 
    alignItems: "center", 
    paddingVertical: 12, 
    marginTop: 8,
  },
  skipText: { 
    color: "#8A8A9A", 
    fontSize: 14, 
    fontWeight: "500",
  },
  terms: { color: "#3D3D50", fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 16 },
});
