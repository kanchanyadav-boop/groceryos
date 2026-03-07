import { useState, useEffect } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, RefreshControl,
} from "react-native";
import {
  collection, query, where, limit,
  getDocs,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../shared/config";
import { Product } from "../../shared/types";
import { useCartStore, useAppStore } from "../../store";
import { router } from "expo-router";
import DrawerMenu from "../../components/DrawerMenu";
import PincodeGate from "../../components/PincodeGate";
import { CATEGORY_LIST } from "../../shared/categories";
import ProductCard, { CARD_WIDTH } from "../../components/ProductCard";


interface CategorySectionProps {
  category: string;
  products: Product[];
}

function CategorySection({ category, products }: CategorySectionProps) {
  if (products.length === 0) return null;

  return (
    <View style={styles.categorySection}>
      <View style={styles.categorySectionHeader}>
        <Text style={styles.categorySectionTitle}>{category}</Text>
        <TouchableOpacity onPress={() => router.push(`/category/${encodeURIComponent(category)}`)}>
          <Text style={styles.seeAllText}>See All ›</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        data={products}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ProductCard product={item} horizontal />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      />
    </View>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonImage} />
      <View style={{ padding: 8, gap: 6 }}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: "60%" }]} />
        <View style={[styles.skeletonLine, { width: "45%", height: 20, marginTop: 4 }]} />
      </View>
    </View>
  );
}

function SkeletonSection() {
  return (
    <View style={styles.categorySection}>
      <View style={[styles.skeletonLine, { width: 120, height: 18, marginHorizontal: 20, marginBottom: 12 }]} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </ScrollView>
    </View>
  );
}

export default function ProductCatalog() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [bestDeals, setBestDeals] = useState<Product[]>([]);
  const [productsByCategory, setProductsByCategory] = useState<Record<string, Product[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const { getItemCount, getTotal } = useCartStore();
  const { selectedPincode, setSelectedPincode, setServiceableStoreId } = useAppStore();
  const cartCount = getItemCount();
  const cartTotal = getTotal();

  const fetchProducts = async () => {
    try {

      // Fetch all in-stock products
      const q = query(
        collection(db, COLLECTIONS.PRODUCTS),
        where("inStock", "==", true),
        limit(200)
      );

      const snap = await getDocs(q);
      const products = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));

      setAllProducts(products);

      // Calculate best deals (highest discount percentage)
      const deals = products
        .filter(p => p.mrp > p.price)
        .map(p => ({
          product: p,
          discountPercent: Math.round(((p.mrp - p.price) / p.mrp) * 100)
        }))
        .sort((a, b) => b.discountPercent - a.discountPercent)
        .slice(0, 10)
        .map(item => item.product);

      setBestDeals(deals);

      // Group products by category
      const grouped: Record<string, Product[]> = {};

      CATEGORY_LIST.forEach(category => {
        const categoryProducts = products
          .filter(p => p.category === category)
          .slice(0, 10); // Limit to 10 per category for performance

        if (categoryProducts.length > 0) {
          grouped[category] = categoryProducts;
        }
      });

      setProductsByCategory(grouped);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  // Debounce search input by 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Filter products using debounced value
  useEffect(() => {
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      setSearchResults(allProducts.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q))
      ));
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch, allProducts]);

  // Only show empty state once the initial fetch has completed
  if (!loading && allProducts.length === 0 && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products available</Text>
        </View>
      </View>
    );
  }

  // Show search results in grid
  if (debouncedSearch.trim()) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Green's Supermarket</Text>
            <TouchableOpacity onPress={() => { setSelectedPincode(null); setServiceableStoreId(null); }}>
              <Text style={styles.headerSubtitle}>
                📍 {selectedPincode ? `Pincode ${selectedPincode} · Change` : "Set your location"}
              </Text>
            </TouchableOpacity>
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
            placeholderTextColor="#4E4E60"
          />
          <TouchableOpacity onPress={() => setSearch("")}>
            <Text style={{ color: "#8A8A9A", fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Search Results Grid */}
        <FlatList
          data={searchResults}
          numColumns={2}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ProductCard product={item} />}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No products match your search</Text>
          }
        />

        {/* Floating Cart */}
        {cartCount > 0 && (
          <TouchableOpacity style={styles.floatingCart} onPress={() => router.push("/cart")}>
            <Text style={styles.floatingCartText}>{cartCount} items  |  ₹{cartTotal}  →</Text>
          </TouchableOpacity>
        )}

        <DrawerMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
      </View>
    );
  }

  // Main home view with categories
  return (
    <View style={styles.container}>
      {/* Pincode Gate — shown when no pincode is selected */}
      <PincodeGate
        visible={!selectedPincode}
        onConfirmed={() => {/* state update handled inside PincodeGate */ }}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Green's Supermarket</Text>
          <TouchableOpacity onPress={() => { setSelectedPincode(null); setServiceableStoreId(null); }}>
            <Text style={styles.headerSubtitle}>
              📍 {selectedPincode ? `Pincode ${selectedPincode} · Change` : "Set your location"}
            </Text>
          </TouchableOpacity>
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
          placeholderTextColor="#4E4E60"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Text style={{ color: "#8A8A9A", fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Quick Access Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipStrip}
      >
        {CATEGORY_LIST.map(cat => (
          <TouchableOpacity
            key={cat}
            style={styles.chip}
            onPress={() => router.push(`/category/${encodeURIComponent(cat)}`)}
          >
            <Text style={styles.chipText}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2ECC71" />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Best Deals Slider */}
        {bestDeals.length > 0 && (
          <View style={styles.dealsSection}>
            <View style={styles.dealsSectionHeader}>
              <Text style={styles.dealsSectionTitle}>🔥 Best Deals</Text>
              <Text style={styles.dealsSectionSubtitle}>
                Up to {Math.round(((bestDeals[0].mrp - bestDeals[0].price) / bestDeals[0].mrp) * 100)}% off
              </Text>
            </View>
            <FlatList
              horizontal
              data={bestDeals}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <ProductCard product={item} horizontal />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Skeleton while loading */}
        {loading && [1, 2, 3].map(i => <SkeletonSection key={i} />)}

        {/* Category Sections */}
        {!loading && Object.entries(productsByCategory).map(([category, products]) => (
          <CategorySection key={category} category={category} products={products} />
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <TouchableOpacity style={styles.floatingCart} onPress={() => router.push("/cart")}>
          <Text style={styles.floatingCartText}>{cartCount} items  |  ₹{cartTotal}  →</Text>
        </TouchableOpacity>
      )}

      {/* Drawer Menu */}
      <DrawerMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  menuBtn: { padding: 8 },
  menuIcon: { fontSize: 28, color: "#fff", fontWeight: "600" },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "#8A8A9A", marginTop: 2 },
  cartBtn: { position: "relative", padding: 8 },
  cartIcon: { fontSize: 24 },
  cartBadge: { position: "absolute", top: 4, right: 4, backgroundColor: "#2ECC71", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center" },
  cartBadgeText: { color: "#000", fontSize: 10, fontWeight: "900" },
  searchContainer: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 16, backgroundColor: "#1E2028", borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: "#262830" },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  scrollContent: { paddingBottom: 120 },

  // Best Deals Section
  dealsSection: { marginBottom: 24 },
  dealsSectionHeader: { paddingHorizontal: 20, marginBottom: 12 },
  dealsSectionTitle: { fontSize: 20, fontWeight: "900", color: "#fff", marginBottom: 4 },
  dealsSectionSubtitle: { fontSize: 13, color: "#2ECC71", fontWeight: "600" },

  // Category Section
  categorySection: { marginBottom: 24 },
  categorySectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 },
  categorySectionTitle: { fontSize: 18, fontWeight: "900", color: "#fff" },
  seeAllText: { fontSize: 14, color: "#2ECC71", fontWeight: "600" },

  // Horizontal List
  horizontalList: { paddingHorizontal: 16, gap: 12 },

  // Product Card
  card: { flex: 1, backgroundColor: "#16181F", borderRadius: 16, overflow: "hidden", marginBottom: 10, borderWidth: 1, borderColor: "#262830" },
  cardHorizontal: { width: CARD_WIDTH, flex: 0 },
  imageContainer: { position: "relative" },
  image: { width: "100%", height: 80 },
  imageFallback: { backgroundColor: "#262830", alignItems: "center", justifyContent: "center" },
  imageFallbackText: { fontSize: 32 },
  discountBadge: { position: "absolute", top: 6, left: 6, backgroundColor: "#E05252", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  discountText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  outOfStockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  outOfStockText: { color: "#fff", fontWeight: "700", fontSize: 11 },
  cardBody: { flex: 1, padding: 6, justifyContent: "space-between" },
  cardTextContent: { flex: 1 },
  productName: { color: "#F0F0F5", fontSize: 11, fontWeight: "600", lineHeight: 14 },
  productUnit: { color: "#4E4E60", fontSize: 9, marginTop: 1 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  price: { color: "#2ECC71", fontWeight: "900", fontSize: 12 },
  mrp: { color: "#4E4E60", fontSize: 10, textDecorationLine: "line-through" },
  addBtn: { marginTop: 4, backgroundColor: "#2ECC7120", borderWidth: 1, borderColor: "#2ECC71", borderRadius: 6, paddingVertical: 4, alignItems: "center" },
  addBtnText: { color: "#2ECC71", fontWeight: "700", fontSize: 11 },
  addBtnDisabled: { marginTop: 4, backgroundColor: "#262830", borderRadius: 6, paddingVertical: 4, alignItems: "center" },
  addBtnDisabledText: { color: "#4E4E60", fontWeight: "600", fontSize: 10 },
  qtyControl: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, backgroundColor: "#2ECC71", borderRadius: 6, overflow: "hidden" },
  qtyBtn: { width: 26, height: 24, alignItems: "center", justifyContent: "center" },
  qtyBtnText: { color: "#000", fontWeight: "900", fontSize: 14, lineHeight: 16 },
  qtyText: { color: "#000", fontWeight: "900", fontSize: 12 },

  // Search Results Grid
  list: { paddingHorizontal: 12, paddingBottom: 120 },
  row: { gap: 10, paddingHorizontal: 4 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { textAlign: "center", color: "#4E4E60", marginTop: 60, fontSize: 14 },

  // Floating Cart
  floatingCart: { position: "absolute", bottom: 24, left: 20, right: 20, backgroundColor: "#2ECC71", borderRadius: 16, paddingVertical: 14, alignItems: "center", shadowColor: "#2ECC71", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  floatingCartText: { color: "#000", fontWeight: "900", fontSize: 14, letterSpacing: 0.3 },

  // Category chip strip
  chipScroll: { height: 44, marginBottom: 4 },
  chipStrip: { paddingHorizontal: 16, paddingRight: 8, alignItems: "center" },
  chip: { backgroundColor: "#1E2028", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "#2ECC7130", marginRight: 8 },
  chipText: { color: "#C8C8D8", fontSize: 13, fontWeight: "600" },

  // Skeleton
  skeletonCard: { width: CARD_WIDTH, backgroundColor: "#16181F", borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#262830" },
  skeletonImage: { width: "100%", height: 80, backgroundColor: "#262830" },
  skeletonLine: { height: 12, backgroundColor: "#262830", borderRadius: 6, width: "80%" },
});
