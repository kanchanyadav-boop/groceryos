import { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, RefreshControl, ScrollView,
} from "react-native";
import {
  collection, query, where, orderBy, getDocs, limit,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../shared/config";
import { Order, Product, OrderItem } from "../../shared/types";
import { useCartStore, useAuthStore, useLoaderStore } from "../../store";
import { router } from "expo-router";
import DrawerMenu from "../../components/DrawerMenu";

interface ProductWithFrequency extends Product {
  orderCount: number;
  lastOrderedAt: string;
}

interface ProductCardProps {
  product: ProductWithFrequency;
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

        <View style={styles.orderInfo}>
          <Text style={styles.orderCount}>
            Ordered {product.orderCount} {product.orderCount === 1 ? "time" : "times"}
          </Text>
        </View>

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

export default function ReorderScreen() {
  const [previouslyOrdered, setPreviouslyOrdered] = useState<ProductWithFrequency[]>([]);
  const [frequentlyBought, setFrequentlyBought] = useState<ProductWithFrequency[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const { user } = useAuthStore();
  const { getItemCount } = useCartStore();
  const { showLoader, hideLoader } = useLoaderStore();
  const cartCount = getItemCount();

  const fetchPreviousOrders = async () => {
    if (!user?.id) {
      hideLoader();
      return;
    }

    try {
      if (!refreshing) {
        showLoader("Loading your orders...");
      }

      // Fetch user's orders
      const ordersQuery = query(
        collection(db, COLLECTIONS.ORDERS),
        where("userId", "==", user.id),
        where("status", "in", ["delivered", "confirmed", "packed", "dispatched"]),
        orderBy("createdAt", "desc"),
        limit(50)
      );

      const ordersSnap = await getDocs(ordersQuery);
      const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order));

      // Extract unique product IDs and count frequency
      const productFrequency: Record<string, { count: number; lastOrderedAt: string }> = {};
      
      orders.forEach(order => {
        order.items.forEach(item => {
          if (!productFrequency[item.skuId]) {
            productFrequency[item.skuId] = {
              count: 0,
              lastOrderedAt: order.createdAt,
            };
          }
          productFrequency[item.skuId].count += 1;
          // Keep the most recent order date
          if (order.createdAt > productFrequency[item.skuId].lastOrderedAt) {
            productFrequency[item.skuId].lastOrderedAt = order.createdAt;
          }
        });
      });

      // Fetch product details for all ordered items
      const productIds = Object.keys(productFrequency);
      
      if (productIds.length === 0) {
        setPreviouslyOrdered([]);
        setFrequentlyBought([]);
        hideLoader();
        setRefreshing(false);
        return;
      }

      // Fetch products in batches (Firestore 'in' query limit is 10)
      const batchSize = 10;
      const productBatches: Product[] = [];

      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const productsQuery = query(
          collection(db, COLLECTIONS.PRODUCTS),
          where("__name__", "in", batch)
        );
        const productsSnap = await getDocs(productsQuery);
        const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
        productBatches.push(...products);
      }

      // Combine product data with frequency
      const productsWithFrequency: ProductWithFrequency[] = productBatches.map(product => ({
        ...product,
        orderCount: productFrequency[product.id].count,
        lastOrderedAt: productFrequency[product.id].lastOrderedAt,
      }));

      // Sort by last ordered date (most recent first)
      const sortedByRecent = [...productsWithFrequency].sort(
        (a, b) => new Date(b.lastOrderedAt).getTime() - new Date(a.lastOrderedAt).getTime()
      );

      // Sort by frequency (most ordered first)
      const sortedByFrequency = [...productsWithFrequency]
        .filter(p => p.orderCount >= 2) // Only show items ordered 2+ times
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 20);

      setPreviouslyOrdered(sortedByRecent);
      setFrequentlyBought(sortedByFrequency);
    } catch (error) {
      console.error("Error fetching previous orders:", error);
    } finally {
      hideLoader();
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPreviousOrders();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPreviousOrders();
  };

  // Show login prompt if not logged in
  if (!user?.id) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Reorder</Text>
            <Text style={styles.headerSubtitle}>Your favorite items</Text>
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

        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyTitle}>Login to see your orders</Text>
          <Text style={styles.emptySubtitle}>
            Sign in to view your previously ordered items
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.loginBtnText}>Login</Text>
          </TouchableOpacity>
        </View>

        <DrawerMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
      </View>
    );
  }

  // Show empty state if no orders
  if (previouslyOrdered.length === 0 && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Reorder</Text>
            <Text style={styles.headerSubtitle}>Your favorite items</Text>
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

        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
          }
        >
          <Text style={styles.emptyEmoji}>🛍️</Text>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>
            Start shopping to see your favorite items here
          </Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => router.push("/(tabs)/home")}
          >
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </ScrollView>

        <DrawerMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Reorder</Text>
          <Text style={styles.headerSubtitle}>Buy again from your favorites</Text>
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Frequently Bought Section */}
        {frequentlyBought.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔥 Frequently Bought</Text>
              <Text style={styles.sectionSubtitle}>Your go-to items</Text>
            </View>
            <FlatList
              horizontal
              data={frequentlyBought}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <ProductCard product={item} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Previously Bought Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Previously Bought</Text>
            <Text style={styles.sectionSubtitle}>{previouslyOrdered.length} items</Text>
          </View>
          <View style={styles.grid}>
            {previouslyOrdered.map(product => (
              <View key={product.id} style={styles.gridItem}>
                <ProductCard product={product} />
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
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
  container: { flex: 1, backgroundColor: "#060A12" },
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
  headerSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  cartBtn: { position: "relative", padding: 8 },
  cartIcon: { fontSize: 24 },
  cartBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#10B981",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: { color: "#000", fontSize: 10, fontWeight: "900" },
  scrollContent: { paddingBottom: 120 },

  // Sections
  section: { marginBottom: 24 },
  sectionHeader: { paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#fff", marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: "#6B7280" },

  // Horizontal List
  horizontalList: { paddingHorizontal: 16, gap: 12 },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 10,
  },
  gridItem: { width: "48%" },

  // Product Card
  card: {
    backgroundColor: "#0C1220",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1C2A3E",
    width: 170,
  },
  imageContainer: { position: "relative" },
  image: { width: "100%", height: 130 },
  imageFallback: {
    backgroundColor: "#1C2A3E",
    alignItems: "center",
    justifyContent: "center",
  },
  imageFallbackText: { fontSize: 40 },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#EF4444",
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
    color: "#E8EDF8",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  productUnit: { color: "#4B5563", fontSize: 11, marginTop: 2 },
  orderInfo: { marginTop: 4 },
  orderCount: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "600",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  price: { color: "#10B981", fontWeight: "900", fontSize: 16 },
  mrp: {
    color: "#4B5563",
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  addBtn: {
    marginTop: 8,
    backgroundColor: "#10B98120",
    borderWidth: 1,
    borderColor: "#10B981",
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  addBtnText: { color: "#10B981", fontWeight: "700", fontSize: 13 },
  addBtnDisabled: {
    marginTop: 8,
    backgroundColor: "#1C2A3E",
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  addBtnDisabledText: { color: "#4B5563", fontWeight: "600", fontSize: 12 },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    backgroundColor: "#10B981",
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

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  loginBtn: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  loginBtnText: { color: "#000", fontWeight: "900", fontSize: 15 },
  shopBtn: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  shopBtnText: { color: "#000", fontWeight: "900", fontSize: 15 },

  // Floating Cart
  floatingCart: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: "#10B981",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  floatingCartText: { color: "#000", fontWeight: "900", fontSize: 15 },
});
