// customer/src/components/GlobalLoader.tsx
import { View, Text, ActivityIndicator, StyleSheet, Modal } from "react-native";

interface GlobalLoaderProps {
  visible: boolean;
  message?: string;
}

export default function GlobalLoader({ visible, message }: GlobalLoaderProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  loaderContainer: {
    backgroundColor: "#0C1220",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    minWidth: 160,
    borderWidth: 1,
    borderColor: "#1C2A3E",
  },
  message: {
    color: "#E8EDF8",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
});
