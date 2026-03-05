// customer/src/screens/Home/ProductCatalog.tsx
import { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, ScrollView, RefreshControl,
} from "react-native";
import {
  collection, query, where, orderBy, limit, startAfter,
  getDocs, QueryDocumentSnapshot, onSnapshot,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../../shared/config";
import { Product } from "../../../shared/types";
import { useCartStore } from "../../store";
import { router } from "expo-router";

const PAGE_SIZE = 20;
const CATEGORIES = ["All", "Fruits & Veg", "Dairy", "Grains", "Beverages", "Snacks", "Meat", "Cleaning"];

interface ProductCardProps {
  product: Product;
}

function ProductCard({ product }: ProductCardProps) {
  const { addItem, removeItem, updateQty, getItemQty } = useCartStore();
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

export default function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { getItemCount } = useCartStore();
  const cartCount = getItemCount();

  const fetchProducts = async (reset = false) => {
    if (reset) setLoading(true);

    let q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where("inStock", "==", true),
      orderBy("name"),
      limit(PAGE_SIZE)
    );

    if (selectedCategory !== "All") {
      q = query(
        collection(db, COLLECTIONS.PRODUCTS),
        where("inStock", "==", true),
        where("category", "==", selectedCategory),
        orderBy("name"),
        limit(PAGE_SIZE)
      );
    }

    if (!reset && lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));

    setProducts(prev => reset ? docs : [...prev, ...docs]);
    setLastDoc(snap.docs[snap.docs.length - 1] || null);
    setHasMore(snap.docs.length === PAGE_SIZE);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    setLastDoc(null);
    fetchProducts(true);
  }, [selectedCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    setLastDoc(null);
    fetchProducts(true);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      fetchProducts(false).finally(() => setLoadingMore(false));
    }
  };

  // Client-side search filter
  const filtered = search.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand?.toLowerCase().includes(search.toLowerCase()) ||
        p.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : products;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>GroceryOS</Text>
          <Text style={styles.headerSubtitle}>📍 Delivering to your area</Text>
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

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search groceries, brands..."
          placeholderTextColor="#4B5563"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Text style={{ color: "#6B7280", fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products Grid */}
      {loading ? (
        <ActivityIndicator color="#10B981" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ProductCard product={item} />}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          onEndReached={!search ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#10B981" style={{ padding: 20 }} /> : null}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {search ? "No products match your search" : "No products in this category"}
            </Text>
          }
        />
      )}

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <TouchableOpacity style={styles.floatingCart} onPress={() => router.push("/cart")}>
          <Text style={styles.floatingCartText}>
            View Cart · {cartCount} items
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060A12" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  headerLeft: {},
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  cartBtn: { position: "relative", padding: 8 },
  cartIcon: { fontSize: 24 },
  cartBadge: { position: "absolute", top: 4, right: 4, backgroundColor: "#10B981", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center" },
  cartBadgeText: { color: "#000", fontSize: 10, fontWeight: "900" },
  searchContainer: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 12, backgroundColor: "#111827", borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: "#1F2937" },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  categoriesScroll: { flexGrow: 0 },
  categoriesContent: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: "#111827", borderRadius: 20, borderWidth: 1, borderColor: "#1F2937" },
  categoryChipActive: { backgroundColor: "#10B98120", borderColor: "#10B981" },
  categoryChipText: { color: "#6B7280", fontSize: 13, fontWeight: "600" },
  categoryChipTextActive: { color: "#10B981" },
  list: { paddingHorizontal: 12, paddingBottom: 120 },
  row: { gap: 10, paddingHorizontal: 4 },
  card: { flex: 1, backgroundColor: "#0C1220", borderRadius: 16, overflow: "hidden", marginBottom: 10, borderWidth: 1, borderColor: "#1C2A3E" },
  imageContainer: { position: "relative" },
  image: { width: "100%", height: 130 },
  imageFallback: { backgroundColor: "#1C2A3E", alignItems: "center", justifyContent: "center" },
  imageFallbackText: { fontSize: 40 },
  discountBadge: { position: "absolute", top: 8, left: 8, backgroundColor: "#EF4444", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discountText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  outOfStockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  outOfStockText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  cardBody: { padding: 10 },
  productName: { color: "#E8EDF8", fontSize: 13, fontWeight: "600", lineHeight: 18 },
  productUnit: { color: "#4B5563", fontSize: 11, marginTop: 2 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  price: { color: "#10B981", fontWeight: "900", fontSize: 16 },
  mrp: { color: "#4B5563", fontSize: 12, textDecorationLine: "line-through" },
  addBtn: { marginTop: 8, backgroundColor: "#10B98120", borderWidth: 1, borderColor: "#10B981", borderRadius: 8, paddingVertical: 6, alignItems: "center" },
  addBtnText: { color: "#10B981", fontWeight: "700", fontSize: 13 },
  addBtnDisabled: { marginTop: 8, backgroundColor: "#1C2A3E", borderRadius: 8, paddingVertical: 6, alignItems: "center" },
  addBtnDisabledText: { color: "#4B5563", fontWeight: "600", fontSize: 12 },
  qtyControl: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, backgroundColor: "#10B981", borderRadius: 8, overflow: "hidden" },
  qtyBtn: { width: 34, height: 32, alignItems: "center", justifyContent: "center" },
  qtyBtnText: { color: "#000", fontWeight: "900", fontSize: 18, lineHeight: 20 },
  qtyText: { color: "#000", fontWeight: "900", fontSize: 14 },
  emptyText: { textAlign: "center", color: "#4B5563", marginTop: 60, fontSize: 14 },
  floatingCart: { position: "absolute", bottom: 24, left: 20, right: 20, backgroundColor: "#10B981", borderRadius: 16, paddingVertical: 16, alignItems: "center", shadowColor: "#10B981", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  floatingCartText: { color: "#000", fontWeight: "900", fontSize: 15 },
});
