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
import { useTheme } from "../../hooks/useTheme";


export default function ProductCatalog() {
  const { colors, isDark } = useTheme();

  // ─── Helper Components (Moved inside for style scope) ──────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────────

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
  const { selectedPincode, setSelectedPincode, setServiceableStoreId, serviceableStoreId } = useAppStore();
  const cartCount = getItemCount();
  const cartTotal = getTotal();

  const styles = getStyles(colors);

  const fetchProducts = async () => {
    try {
      // Fetch in-stock products AND store inventory in parallel
      const productQuery = query(
        collection(db, COLLECTIONS.PRODUCTS),
        where("inStock", "==", true),
        limit(200)
      );

      const [productSnap, invSnap] = await Promise.all([
        getDocs(productQuery),
        serviceableStoreId
          ? getDocs(query(collection(db, COLLECTIONS.INVENTORY), where("storeId", "==", serviceableStoreId)))
          : Promise.resolve(null),
      ]);

      let products = productSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));

      // When a store is known, show only products actually in stock at that store
      if (invSnap && !invSnap.empty) {
        const stockedSkuIds = new Set(
          invSnap.docs
            .filter(d => (d.data().available ?? 0) > 0)
            .map(d => d.data().skuId as string)
        );
        products = products.filter(p => stockedSkuIds.has(p.id));
      }

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

  // Re-fetch whenever the serviceable store changes (pincode selection / login)
  useEffect(() => {
    fetchProducts();
  }, [serviceableStoreId]);

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

  // Main view with conditional body
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

      {/* Search Bar - Shared across all states */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search groceries, brands..."
          placeholderTextColor={colors.textTertiary}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Text style={{ color: colors.textSecondary, fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Body Content */}
      {!loading && allProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products available</Text>
        </View>
      ) : debouncedSearch.trim() ? (
        /* Search Results Grid */
        <FlatList
          data={searchResults}
          numColumns={3}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ProductCard product={item} horizontal />}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No products match your search</Text>
          }
        />
      ) : (
        /* Main Home View with categories */
        <>
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
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />
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
        </>
      )}

      {/* Floating Cart Button - persistent */}
      {cartCount > 0 && (
        <TouchableOpacity style={styles.floatingCart} onPress={() => router.push("/cart")}>
          <Text style={styles.floatingCartText}>{cartCount} items  |  ₹{cartTotal}  →</Text>
        </TouchableOpacity>
      )}

      {/* Drawer Menu - persistent */}
      <DrawerMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  menuBtn: { padding: 8 },
  menuIcon: { fontSize: 28, color: colors.textPrimary, fontWeight: "600" },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 22, fontWeight: "900", color: colors.green },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cartBtn: { position: "relative", padding: 8 },
  cartIcon: { fontSize: 24 },
  cartBadge: { position: "absolute", top: 4, right: 4, backgroundColor: colors.green, borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center" },
  cartBadgeText: { color: colors.bg, fontSize: 10, fontWeight: "900" },
  searchContainer: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 16, backgroundColor: colors.surfaceAlt, borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: colors.border },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14 },
  scrollContent: { paddingBottom: 120 },

  // Best Deals Section
  dealsSection: { marginBottom: 24 },
  dealsSectionHeader: { paddingHorizontal: 20, marginBottom: 12 },
  dealsSectionTitle: { fontSize: 20, fontWeight: "900", color: colors.textPrimary, marginBottom: 4 },
  dealsSectionSubtitle: { fontSize: 13, color: colors.green, fontWeight: "600" },

  // Category Section
  categorySection: { marginBottom: 24 },
  categorySectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 },
  categorySectionTitle: { fontSize: 18, fontWeight: "900", color: colors.textPrimary },
  seeAllText: { fontSize: 14, color: colors.green, fontWeight: "600" },

  // Horizontal List
  horizontalList: { paddingHorizontal: 16, gap: 12 },

  // Search Results Grid
  list: { paddingHorizontal: 12, paddingBottom: 120 },
  row: { gap: 6, paddingHorizontal: 4 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { textAlign: "center", color: colors.textTertiary, marginTop: 60, fontSize: 14 },

  // Floating Cart
  floatingCart: { position: "absolute", bottom: 24, left: 20, right: 20, backgroundColor: colors.green, borderRadius: 16, paddingVertical: 14, alignItems: "center", shadowColor: colors.green, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  floatingCartText: { color: colors.bg, fontWeight: "900", fontSize: 14, letterSpacing: 0.3 },

  // Category chip strip
  chipScroll: { height: 44, marginBottom: 4 },
  chipStrip: { paddingHorizontal: 16, paddingRight: 8, alignItems: "center" },
  chip: { backgroundColor: colors.surfaceAlt, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.greenBorder, marginRight: 8 },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },

  // Skeleton
  skeletonCard: { width: CARD_WIDTH, backgroundColor: colors.surface, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  skeletonImage: { width: "100%", height: 80, backgroundColor: colors.surfaceAlt },
  skeletonLine: { height: 12, backgroundColor: colors.surfaceAlt, borderRadius: 6, width: "80%" },
});
