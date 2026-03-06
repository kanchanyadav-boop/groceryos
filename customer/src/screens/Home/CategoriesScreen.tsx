import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Image,
} from "react-native";
import { router } from "expo-router";
import { GROCERY_CATEGORIES, CATEGORY_LIST } from "../../shared/categories";
import { useCartStore } from "../../store";
import DrawerMenu from "../../components/DrawerMenu";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 60) / 2;

// Category local images - Place images in customer/assets/categories/
// If images are missing, fallback to colored background will be shown
const CATEGORY_IMAGES: Record<string, any> = {};

// Safely load images with try-catch to prevent crashes if images don't exist
try {
  CATEGORY_IMAGES["Fruits & Vegetables"] = require("../../../assets/categories/fruits-vegetables.png");
} catch (e) {}
try {
  CATEGORY_IMAGES["Dairy & Bakery"] = require("../../../assets/categories/dairy-bakery.png");
} catch (e) {}
try {
  CATEGORY_IMAGES["Staples"] = require("../../../assets/categories/staples.png");
} catch (e) {}
try {
  CATEGORY_IMAGES["Snacks & Beverages"] = require("../../../assets/categories/snacks-beverages.png");
} catch (e) {}
try {
  CATEGORY_IMAGES["Packaged Food"] = require("../../../assets/categories/packaged-food.png");
} catch (e) {}
try {
  CATEGORY_IMAGES["Personal Care"] = require("../../../assets/categories/personal-care.png");
} catch (e) {}
try {
  CATEGORY_IMAGES["Household"] = require("../../../assets/categories/household.png");
} catch (e) {}
try {
  CATEGORY_IMAGES["Meat, Fish & Eggs"] = require("../../../assets/categories/meat-fish-eggs.png");
} catch (e) {}
try {
  CATEGORY_IMAGES["Frozen & Instant"] = require("../../../assets/categories/frozen-instant.png");
} catch (e) {}
try {
  CATEGORY_IMAGES["Baby Care"] = require("../../../assets/categories/baby-care.png");
} catch (e) {}
try {
  CATEGORY_IMAGES["Pet Care"] = require("../../../assets/categories/pet-care.png");
} catch (e) {}

// Category emojis — used as fallback when local image is missing
const CATEGORY_EMOJIS: Record<string, string> = {
  "Fruits & Vegetables": "🥦",
  "Dairy & Bakery": "🥛",
  "Staples": "🌾",
  "Snacks & Beverages": "🍿",
  "Packaged Food": "🥫",
  "Personal Care": "🧴",
  "Household": "🏠",
  "Meat, Fish & Eggs": "🥚",
  "Frozen & Instant": "🧊",
  "Baby Care": "👶",
  "Pet Care": "🐾",
};

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  "Fruits & Vegetables": "#2ECC71",
  "Dairy & Bakery": "#F59E0B",
  "Staples": "#8B5CF6",
  "Snacks & Beverages": "#E05252",
  "Packaged Food": "#3B82F6",
  "Personal Care": "#EC4899",
  "Household": "#14B8A6",
  "Meat, Fish & Eggs": "#DC2626",
  "Frozen & Instant": "#06B6D4",
  "Baby Care": "#F472B6",
  "Pet Care": "#F97316",
};

interface CategoryCardProps {
  category: string;
  onPress: () => void;
}

function CategoryCard({ category, onPress }: CategoryCardProps) {
  const imageSource = CATEGORY_IMAGES[category];
  const color = CATEGORY_COLORS[category] || "#8A8A9A";
  const subcategories = GROCERY_CATEGORIES[category as keyof typeof GROCERY_CATEGORIES];

  return (
    <TouchableOpacity
      style={[styles.categoryCard, { borderColor: color + "30" }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.categoryImageContainer}>
        {imageSource ? (
          <Image
            source={imageSource}
            style={styles.categoryImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.categoryImageFallback, { backgroundColor: color + "20" }]}>
            <Text style={styles.categoryEmoji}>{CATEGORY_EMOJIS[category] || "🛒"}</Text>
          </View>
        )}
      </View>
      <Text style={styles.categoryName} numberOfLines={2}>
        {category}
      </Text>
      <Text style={styles.subcategoryCount} numberOfLines={1}>
        {subcategories.slice(0, 2).join(" · ")}
      </Text>
    </TouchableOpacity>
  );
}

export default function CategoriesScreen() {
  const [menuVisible, setMenuVisible] = useState(false);
  const { getItemCount } = useCartStore();
  const cartCount = getItemCount();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Shop by Category</Text>
          <Text style={styles.headerSubtitle}>Browse all categories</Text>
        </View>
        <TouchableOpacity style={styles.cartBtn} onPress={() => router.push("/cart")}>
          <Text style={styles.cartIcon}>🛒</Text>
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Categories Grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.grid}>
          {CATEGORY_LIST.map((category) => (
            <CategoryCard
              key={category}
              category={category}
              onPress={() => router.push(`/category/${encodeURIComponent(category)}` as any)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <TouchableOpacity style={styles.floatingCart} onPress={() => router.push("/cart")}>
          <Text style={styles.floatingCartText}>
            View Cart · {cartCount} items
          </Text>
        </TouchableOpacity>
      )}

      {/* Drawer Menu */}
      <DrawerMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  menuBtn: { padding: 8 },
  menuIcon: { fontSize: 28, color: "#fff", fontWeight: "600" },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "#8A8A9A", marginTop: 2 },
  cartBtn: { position: "relative", padding: 8 },
  cartIcon: { fontSize: 24 },
  cartBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#2ECC71",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: { color: "#000", fontSize: 10, fontWeight: "900" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
  },
  categoryCard: {
    width: CARD_WIDTH,
    backgroundColor: "#16181F",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    alignItems: "center",
  },
  categoryImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryImageFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryEmoji: { fontSize: 32 },
  categoryName: {
    color: "#F0F0F5",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  subcategoryCount: {
    color: "#8A8A9A",
    fontSize: 11,
    textAlign: "center",
  },
  floatingCart: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: "#2ECC71",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#2ECC71",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  floatingCartText: { color: "#000", fontWeight: "900", fontSize: 15 },
});
