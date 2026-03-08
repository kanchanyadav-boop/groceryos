// customer/src/components/DrawerMenu.tsx
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Linking } from "react-native";
import { router } from "expo-router";
import { useAuthStore, useAppStore } from "../store";
import { useTheme } from "../hooks/useTheme";

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
}

export default function DrawerMenu({ visible, onClose }: DrawerMenuProps) {
  const { colors, isDark, theme } = useTheme();
  const { user, clearUser } = useAuthStore();
  const { setTheme } = useAppStore();

  const styles = getStyles(colors);

  const menuItems = [
    { icon: "👤", label: "My Profile", route: "/(tabs)/profile" },
    { icon: "📦", label: "My Orders", route: "/(tabs)/orders" },
    { icon: "📍", label: "My Addresses", route: "/address" },
    { icon: "🏪", label: "Our Stores", route: "/stores" },
    { icon: "❓", label: "Help & Support", route: "/help" },
    { icon: "↩️", label: "Refund Policy", route: "/refund-policy" },
    { icon: "ℹ️", label: "About Us", route: "/about" },
  ];

  const handleNavigation = (route: string) => {
    onClose();
    router.push(route as any);
  };

  const handleLogout = () => {
    clearUser();
    onClose();
    router.replace("/(auth)/login");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.drawer}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : "G"}
                </Text>
              </View>
              <Text style={styles.userName}>{user?.name || "Guest User"}</Text>
              <Text style={styles.userPhone}>{user?.phone || "Browse as guest"}</Text>
            </View>

            {/* Menu Items */}
            <View style={styles.menuSection}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => handleNavigation(item.route)}
                >
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Contact */}
            <View style={styles.contactSection}>
              <Text style={styles.contactTitle}>Contact Us</Text>
              <TouchableOpacity
                style={styles.contactItem}
                onPress={() => Linking.openURL('tel:+919999999999')}
              >
                <Text style={styles.contactIcon}>📞</Text>
                <Text style={styles.contactText}>+91 9999 999 999</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactItem}
                onPress={() => Linking.openURL('mailto:support@greenssupermarket.com')}
              >
                <Text style={styles.contactIcon}>✉️</Text>
                <Text style={styles.contactText}>support@greenssupermarket.com</Text>
              </TouchableOpacity>
            </View>

            {/* Theme Toggle */}
            <View style={styles.themeSection}>
              <Text style={styles.contactTitle}>Appearance</Text>
              <TouchableOpacity
                style={styles.themeToggle}
                onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <View style={styles.themeToggleLeft}>
                  <Text style={styles.menuIcon}>{isDark ? "🌙" : "☀️"}</Text>
                  <Text style={styles.menuLabel}>{isDark ? "Dark Mode" : "Light Mode"}</Text>
                </View>
                <View style={[styles.switchTrack, { backgroundColor: isDark ? colors.green : colors.border }]}>
                  <View style={[styles.switchThumb, { transform: [{ translateX: isDark ? 20 : 0 }] }]} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Logout */}
            {user && (
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>🚪 Logout</Text>
              </TouchableOpacity>
            )}

            {/* Version */}
            <Text style={styles.version}>Version 1.0.0</Text>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  drawer: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 40,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: colors.bg,
    fontSize: 28,
    fontWeight: "900",
  },
  userName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  userPhone: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  menuSection: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  menuLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  menuArrow: {
    color: colors.textTertiary,
    fontSize: 24,
  },
  themeSection: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  themeToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  themeToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: "center",
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  contactSection: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  contactTitle: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  contactIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  contactText: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "600",
  },
  logoutBtn: {
    marginHorizontal: 24,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: {
    color: colors.red,
    fontSize: 15,
    fontWeight: "700",
  },
  version: {
    textAlign: "center",
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 24,
  },
});
