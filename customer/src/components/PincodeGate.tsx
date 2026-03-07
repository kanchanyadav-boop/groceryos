// customer/src/components/PincodeGate.tsx
// Modal that validates a user's pincode against active stores before they browse.
// Shown on the home screen when selectedPincode is null (new user, first launch,
// or returning user who cleared location).

import { useState } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { COLLECTIONS } from "../shared/config";
import { Store } from "../shared/types";
import { useAppStore } from "../store";

interface Props {
  visible: boolean;
  onConfirmed: () => void;
}

export default function PincodeGate({ visible, onConfirmed }: Props) {
  const [pincode, setPincode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [confirmedStore, setConfirmedStore] = useState("");

  const { setSelectedPincode, setServiceableStoreId } = useAppStore();

  const check = async () => {
    if (pincode.length !== 6) {
      setError("Enter a valid 6-digit pincode");
      return;
    }
    setChecking(true);
    setError("");
    setConfirmedStore("");

    try {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.STORES), where("isActive", "==", true))
      );
      const stores = snap.docs.map(d => ({ id: d.id, ...d.data() } as Store));
      const match = stores.find(s => s.serviceablePincodes.includes(pincode));

      if (match) {
        setSelectedPincode(pincode);
        setServiceableStoreId(match.id);
        setConfirmedStore(match.name);
        // Brief success flash before dismissing
        setTimeout(() => onConfirmed(), 700);
      } else {
        setError(`We don't deliver to ${pincode} yet. Try a nearby pincode.`);
      }
    } catch {
      setError("Could not check serviceability. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const ready = pincode.length === 6 && !checking && !confirmedStore;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>📍</Text>
          <Text style={styles.title}>Where should we deliver?</Text>
          <Text style={styles.subtitle}>
            Enter your pincode to check if we deliver to your area
          </Text>

          <TextInput
            style={[styles.input, error ? styles.inputError : confirmedStore ? styles.inputSuccess : null]}
            value={pincode}
            onChangeText={v => {
              setPincode(v.replace(/\D/g, "").slice(0, 6));
              setError("");
              setConfirmedStore("");
            }}
            placeholder="6-digit pincode"
            placeholderTextColor="#4E4E60"
            keyboardType="number-pad"
            maxLength={6}
            editable={!checking && !confirmedStore}
          />

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : confirmedStore ? (
            <Text style={styles.successText}>Delivering via {confirmedStore}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, !ready && styles.btnDisabled]}
            onPress={check}
            disabled={!ready}
          >
            {checking
              ? <ActivityIndicator color="#000" size="small" />
              : confirmedStore
                ? <Text style={styles.btnText}>Great, let's shop!</Text>
                : <Text style={styles.btnText}>Check Availability</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "#16181F",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#262830",
  },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#7A7A8E",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  input: {
    width: "100%",
    backgroundColor: "#1E2028",
    borderWidth: 1,
    borderColor: "#262830",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    color: "#fff",
    fontSize: 24,
    letterSpacing: 10,
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "700",
  },
  inputError: { borderColor: "#E05252" },
  inputSuccess: { borderColor: "#2ECC71" },
  errorText: {
    color: "#E05252",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  successText: {
    color: "#2ECC71",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  btn: {
    width: "100%",
    backgroundColor: "#2ECC71",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#000", fontWeight: "900", fontSize: 15 },
});
