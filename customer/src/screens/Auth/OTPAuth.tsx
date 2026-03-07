// customer/src/screens/Auth/OTPAuth.tsx
import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { signInWithCustomToken, signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { auth, db } from "../../lib/firebase";
import { COLLECTIONS } from "../../shared/config";
import { useAuthStore, useLoaderStore, useCartStore } from "../../store";
import { User } from "../../shared/types";
import { router } from "expo-router";

const functions = getFunctions(app);

// ─── Dev test credentials (only active in __DEV__ builds) ───────────────────
// Use phone 9999999999 + OTP 123456 to test without deploying Cloud Functions.
// These are stripped out in production builds automatically.
const DEV_TEST_PHONE = "9999999999";
const DEV_TEST_OTP = "123456";
// ⚠️  DEV_MODE = true  →  any phone + OTP 123456 bypasses Twilio (anonymous auth)
// Set to false when Twilio is live and ready for real SMS verification.
const DEV_MODE = true;

function getFriendlyError(code: string, message?: string): string {
  switch (code) {
    case "invalid-argument": return message || "Invalid input. Please check and try again.";
    case "not-found": return "OTP not found. Please request a new one.";
    case "deadline-exceeded": return "OTP expired. Please request a new one.";
    case "permission-denied": return "Too many wrong attempts. Please request a new OTP.";
    case "resource-exhausted": return message || "Too many requests. Please try again later.";
    case "unavailable":
    case "internal": return "Service temporarily unavailable. Please try again.";
    default: return "Something went wrong. Please try again.";
  }
}

export default function OTPAuth() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [resendTimer, setResendTimer] = useState(0);
  const [phoneError, setPhoneError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [sending, setSending] = useState(false);

  const { setUser } = useAuthStore();
  const { showLoader, hideLoader } = useLoaderStore();

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const digits = phone.replace(/\D/g, "");
  const normalized = `+91${digits}`;
  const isTestPhone = __DEV__ && digits === DEV_TEST_PHONE;

  const sendOTP = async (isResend = false) => {
    if (digits.length !== 10) {
      setPhoneError("Enter a valid 10-digit mobile number");
      return;
    }
    setPhoneError("");

    // ── Dev shortcut ──────────────────────────────────────────────────────────
    if (isTestPhone) {
      setStep("otp");
      setResendTimer(30);
      setOtp("");
      setOtpError("");
      return;
    }

    // ── Production: call Cloud Function ───────────────────────────────────────
    setSending(true);
    try {
      await httpsCallable(functions, "sendOtp")({ phone: normalized });
      setStep("otp");
      setResendTimer(30);
      setOtp("");
      setOtpError("");
      if (DEV_MODE) return; // skip actual Twilio call in dev
    } catch (err: any) {
      if (DEV_MODE) {
        // In dev mode, sendOtp CF may not be deployed — just proceed to OTP step
        setStep("otp");
        setResendTimer(30);
        setOtp("");
        setOtpError("");
        return;
      }
      // Distinguish "function not deployed" from real errors
      const raw: string = err?.code || "";
      if (raw === "functions/not-found" || raw === "functions/unavailable") {
        setPhoneError("OTP service is not available right now. Please try again later.");
      } else {
        const code = raw.replace("functions/", "") || "unknown";
        setPhoneError(getFriendlyError(code, err.message));
      }
    } finally {
      setSending(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setOtpError("Please enter the 6-digit OTP");
      return;
    }
    setOtpError("");
    showLoader("Verifying OTP...");

    try {
      // ── Dev bypass — any phone + 123456 works ──────────────────────────────
      if (DEV_MODE || isTestPhone) {
        if (otp !== DEV_TEST_OTP) {
          setOtpError(`Dev mode: use OTP ${DEV_TEST_OTP}`);
          hideLoader();
          return;
        }
        const cred = await signInAnonymously(auth);
        const realFirebaseUid = cred.user.uid;
        const phoneDocId = normalized.replace("+", "").replace(/\s/g, "");

        const userRef = doc(db, COLLECTIONS.USERS, phoneDocId);
        const snap = await getDoc(userRef);
        let userProfile: User;
        if (snap.exists()) {
          userProfile = { id: snap.id, ...snap.data() } as User;
          await setDoc(userRef, { lastLoginAt: serverTimestamp(), firebaseUid: realFirebaseUid }, { merge: true });
        } else {
          userProfile = { id: phoneDocId, name: "", phone: normalized, addresses: [] };
          await setDoc(userRef, { ...userProfile, firebaseUid: realFirebaseUid, createdAt: serverTimestamp() });
        }
        setUser(userProfile, realFirebaseUid);
        useCartStore.getState().clearCart(); // Clear cart for new login
        router.replace(userProfile.name ? "/(tabs)/home" : "/(auth)/onboarding");
        return;
      }

      // ── Production: Cloud Function verifies OTP, returns custom token ───────
      const { data } = await httpsCallable(functions, "verifyOtp")({ phone: normalized, otp }) as any;
      await signInWithCustomToken(auth, data.customToken);

      const userRef = doc(db, COLLECTIONS.USERS, data.userId);
      const snap = await getDoc(userRef);
      let userProfile: User;
      if (snap.exists()) {
        userProfile = { id: snap.id, ...snap.data() } as User;
      } else {
        userProfile = { id: data.userId, name: "", phone: normalized, addresses: [] };
      }
      setUser(userProfile, data.userId);
      useCartStore.getState().clearCart();
      router.replace(userProfile.name ? "/(tabs)/home" : "/(auth)/onboarding");

    } catch (err: any) {
      const raw: string = err?.code || "";
      if (raw === "functions/not-found" || raw === "functions/unavailable") {
        setOtpError("OTP service is not available right now. Please try again later.");
      } else {
        const code = raw.replace("functions/", "") || "unknown";
        setOtpError(getFriendlyError(code, err.message));
      }
    } finally {
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

        {step === "phone" ? (
          <>
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
                editable={!sending}
              />
            </View>
            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
            {isTestPhone ? (
              <Text style={styles.devHint}>Dev mode · use OTP {DEV_TEST_OTP}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.btn, sending && styles.btnDisabled]}
              onPress={() => sendOTP(false)}
              disabled={sending}
            >
              {sending
                ? <ActivityIndicator color="#000" size="small" />
                : <Text style={styles.btnText}>Send OTP</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace("/(tabs)/home")} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip for now, just browse products →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>OTP sent to +91 {phone}</Text>
            {isTestPhone ? (
              <Text style={styles.devHint}>Dev mode · enter {DEV_TEST_OTP}</Text>
            ) : null}
            <TextInput
              style={[styles.otpInput, otpError ? styles.inputError : null]}
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
              <TouchableOpacity
                onPress={() => { setStep("phone"); setOtpError(""); }}
                style={styles.backBtn}
              >
                <Text style={styles.backText}>← Change number</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => sendOTP(true)}
                disabled={resendTimer > 0 || sending}
                style={styles.resendBtn}
              >
                <Text style={[styles.resendText, (resendTimer > 0 || sending) && styles.resendDisabled]}>
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
  devHint: { color: "#F59E0B", fontSize: 11, fontWeight: "700", marginBottom: 8, textAlign: "center" },
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
  otpInput: {
    backgroundColor: "#1E2028", borderWidth: 1, borderColor: "#262830",
    borderRadius: 14, paddingHorizontal: 16, height: 62, color: "#fff",
    fontSize: 28, letterSpacing: 12, textAlign: "center", marginBottom: 4,
  },
  inputError: { borderColor: "#E05252" },
  btn: {
    backgroundColor: "#2ECC71", borderRadius: 14, height: 52,
    alignItems: "center", justifyContent: "center", marginTop: 12, marginBottom: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#000", fontWeight: "900", fontSize: 15 },
  resendRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  backBtn: { paddingVertical: 8 },
  backText: { color: "#8A8A9A", fontSize: 14 },
  resendBtn: { paddingVertical: 8 },
  resendText: { color: "#2ECC71", fontSize: 14, fontWeight: "600" },
  resendDisabled: { color: "#4E4E60" },
  errorText: { color: "#E05252", fontSize: 12, marginBottom: 8, marginTop: 2 },
  skipBtn: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  skipText: { color: "#8A8A9A", fontSize: 14, fontWeight: "500" },
  terms: { color: "#3D3D50", fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 16 },
});
