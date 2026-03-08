// customer/src/components/GlobalLoader.tsx
import { View, Text, ActivityIndicator, StyleSheet, Modal } from "react-native";
import { useTheme } from "../hooks/useTheme";

interface GlobalLoaderProps {
  visible: boolean;
  message?: string;
}

export default function GlobalLoader({ visible, message }: GlobalLoaderProps) {
  const { colors } = useTheme();
  if (!visible) return null;

  const styles = getStyles(colors);

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

const getStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  loaderContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    minWidth: 160,
    borderWidth: 1,
    borderColor: colors.border,
  },
  message: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
});
