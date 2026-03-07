import { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl,
} from "react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../shared/config";
import { Product } from "../../shared/types";
import { useCartStore, useLoaderStore } from "../../store";
import { router, useLocalSearchParams } from "expo-router";
import { GROCERY_CATEGORIES } from "../../shared/categories";
import ProductCard from "../../components/ProductCard";

export default function CategoryProducts() {
  const { category: encodedCategory } = useLocalSearchParams<{ category: string }>();
  const category = decodeURIComponent(encodedCategory || "");

  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const { getItemCount, getTotal } = useCartStore();
  const { showLoader, hideLoader } = useLoaderStore();
  const cartCount = getItemCount();
  const cartTotal = getTotal();

  const subcategories = GROCERY_CATEGORIES[category as keyof typeof GROCERY_CATEGORIES] || [];

  const fetchProducts = async () => {
    try {
      if (!refreshing) showLoader("Loading products...");
      const q = query(
        collection(db, COLLECTIONS.PRODUCTS),
        where("category", "==", category),
        where("inStock", "==", true)
      );
      const snap = await getDocs(q);
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      hideLoader();
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (category) fetchProducts();
  }, [category]);

  const filteredProducts = selectedSubcategory
    ? products.filter(p => p.subcategory === selectedSubcategory)
    : products;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{category}</Text>
          <Text style={styles.headerSubtitle}>{filteredProducts.length} products</Text>
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

      {/* Subcategory Filter */}
      {subcategories.length > 0 && (
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            data={[null, ...subcategories]}
            keyExtractor={(item, index) => item || `all-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filterChip, selectedSubcategory === item && styles.filterChipActive]}
                onPress={() => setSelectedSubcategory(item)}
              >
                <Text style={[styles.filterChipText, selectedSubcategory === item && styles.filterChipTextActive]}>
                  {item || "All"}
                </Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
          />
        </View>
      )}

      {/* Products Grid — 3 columns to match the tighter card width */}
      <FlatList
        data={filteredProducts}
        numColumns={3}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ProductCard product={item} />}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProducts(); }} tintColor="#2ECC71" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products in this category</Text>
          </View>
        }
      />

      {/* Floating Cart */}
      {cartCount > 0 && (
        <TouchableOpacity style={styles.floatingCart} onPress={() => router.push("/cart")}>
          <Text style={styles.floatingCartText}>{cartCount} items  |  ₹{cartTotal}  →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },
  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 20,
    paddingTop: 56, paddingBottom: 12,
  },
  backBtn: { padding: 8 },
  backIcon: { fontSize: 28, color: "#fff", fontWeight: "600" },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "#8A8A9A", marginTop: 2 },
  cartBtn: { position: "relative", padding: 8 },
  cartIcon: { fontSize: 24 },
  cartBadge: {
    position: "absolute", top: 4, right: 4,
    backgroundColor: "#2ECC71", borderRadius: 8, minWidth: 16, height: 16,
    alignItems: "center", justifyContent: "center",
  },
  cartBadgeText: { color: "#000", fontSize: 10, fontWeight: "900" },

  // Filter chips
  filterContainer: { marginBottom: 10 },
  filterList: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    backgroundColor: "#16181F", borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "#2ECC7130",
  },
  filterChipActive: { backgroundColor: "#2ECC71", borderColor: "#2ECC71" },
  filterChipText: { color: "#C8C8D8", fontSize: 12, fontWeight: "600" },
  filterChipTextActive: { color: "#000", fontWeight: "700" },

  // Grid
  list: { paddingHorizontal: 10, paddingBottom: 120 },
  row: { gap: 8, paddingHorizontal: 2, marginBottom: 0 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyText: { color: "#4E4E60", fontSize: 14 },

  floatingCart: {
    position: "absolute", bottom: 24, left: 20, right: 20,
    backgroundColor: "#2ECC71", borderRadius: 16, paddingVertical: 14,
    alignItems: "center", shadowColor: "#2ECC71",
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4,
    shadowRadius: 16, elevation: 10,
  },
  floatingCartText: { color: "#000", fontWeight: "900", fontSize: 14 },
});
