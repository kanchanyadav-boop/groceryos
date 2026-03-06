import { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../shared/config";
import { Product } from "../../shared/types";
import { useCartStore, useLoaderStore } from "../../store";
import { router, useLocalSearchParams } from "expo-router";
import { GROCERY_CATEGORIES } from "../../shared/categories";

interface ProductCardProps {
  product: Product;
}

function ProductCard({ product }: ProductCardProps) {
  const { addItem, updateQty, getItemQty } = useCartStore();
  const qty = getItemQty(product.id);
  const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/product/${product.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        {product.imageUrls?.[0] ? (
          <Image source={{ uri: product.imageUrls[0] }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.imageFallbackText}>🛒</Text>
          </View>
        )}
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% off</Text>
          </View>
        )}
        {!product.inStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.productUnit}>{product.unit}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{product.price}</Text>
          {product.mrp > product.price && (
            <Text style={styles.mrp}>₹{product.mrp}</Text>
          )}
        </View>

        {product.inStock ? (
          qty > 0 ? (
            <View style={styles.qtyControl}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => updateQty(product.id, qty - 1)}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{qty}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => addItem(product)}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => addItem(product)}
            >
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          )
        ) : (
          <View style={styles.addBtnDisabled}>
            <Text style={styles.addBtnDisabledText}>Unavailable</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function CategoryProducts() {
  const { category: encodedCategory } = useLocalSearchParams<{ category: string }>();
  const category = decodeURIComponent(encodedCategory || "");
  
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const { getItemCount } = useCartStore();
  const { showLoader, hideLoader } = useLoaderStore();
  const cartCount = getItemCount();

  const subcategories = GROCERY_CATEGORIES[category as keyof typeof GROCERY_CATEGORIES] || [];

  const fetchProducts = async () => {
    try {
      if (!refreshing) {
        showLoader("Loading products...");
      }

      const q = query(
        collection(db, COLLECTIONS.PRODUCTS),
        where("category", "==", category),
        where("inStock", "==", true)
      );

      const snap = await getDocs(q);
      const fetchedProducts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      hideLoader();
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (category) {
      fetchProducts();
    }
  }, [category]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

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
                style={[
                  styles.filterChip,
                  selectedSubcategory === item && styles.filterChipActive,
                ]}
                onPress={() => setSelectedSubcategory(item)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedSubcategory === item && styles.filterChipTextActive,
                  ]}
                >
                  {item || "All"}
                </Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
          />
        </View>
      )}

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        numColumns={2}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ProductCard product={item} />}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2ECC71" />
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
          <Text style={styles.floatingCartText}>View Cart · {cartCount} items</Text>
        </TouchableOpacity>
      )}
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
  backBtn: { padding: 8 },
  backIcon: { fontSize: 28, color: "#fff", fontWeight: "600" },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#fff" },
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
  
  // Filter
  filterContainer: { marginBottom: 12 },
  filterList: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    backgroundColor: "#16181F",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#262830",
  },
  filterChipActive: {
    backgroundColor: "#2ECC71",
    borderColor: "#2ECC71",
  },
  filterChipText: {
    color: "#8A8A9A",
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#000",
    fontWeight: "700",
  },

  // Products Grid
  list: { paddingHorizontal: 12, paddingBottom: 120 },
  row: { gap: 10, paddingHorizontal: 4 },
  card: {
    flex: 1,
    backgroundColor: "#16181F",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#262830",
  },
  imageContainer: { position: "relative" },
  image: { width: "100%", height: 130 },
  imageFallback: {
    backgroundColor: "#262830",
    alignItems: "center",
    justifyContent: "center",
  },
  imageFallbackText: { fontSize: 40 },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#E05252",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  outOfStockText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  cardBody: { padding: 10 },
  productName: {
    color: "#F0F0F5",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  productUnit: { color: "#4E4E60", fontSize: 11, marginTop: 2 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  price: { color: "#2ECC71", fontWeight: "900", fontSize: 16 },
  mrp: {
    color: "#4E4E60",
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  addBtn: {
    marginTop: 8,
    backgroundColor: "#2ECC7120",
    borderWidth: 1,
    borderColor: "#2ECC71",
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  addBtnText: { color: "#2ECC71", fontWeight: "700", fontSize: 13 },
  addBtnDisabled: {
    marginTop: 8,
    backgroundColor: "#262830",
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  addBtnDisabledText: { color: "#4E4E60", fontWeight: "600", fontSize: 12 },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    backgroundColor: "#2ECC71",
    borderRadius: 8,
    overflow: "hidden",
  },
  qtyBtn: {
    width: 34,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { color: "#000", fontWeight: "900", fontSize: 18, lineHeight: 20 },
  qtyText: { color: "#000", fontWeight: "900", fontSize: 14 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: { color: "#4E4E60", fontSize: 14 },
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
