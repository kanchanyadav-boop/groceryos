// customer/app/product/[id].tsx
import { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Dimensions, FlatList, NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import { COLLECTIONS } from "../../src/shared/config";
import { Product } from "../../src/shared/types";
import { useCartStore } from "../../src/store";
import { router, useLocalSearchParams } from "expo-router";

const { width: W } = Dimensions.get("window");

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const { addItem, updateQty, getItemQty } = useCartStore();
  const qty = product ? getItemQty(product.id) : 0;

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, COLLECTIONS.PRODUCTS, id)).then(snap => {
      if (snap.exists()) setProduct({ id: snap.id, ...snap.data() } as Product);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#10B981" size="large" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const discount = product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  const images = product.imageUrls?.length > 0 ? product.imageUrls : [];

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setActiveImage(idx);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View style={styles.imageSection}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          {images.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
              >
                {images.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.image} resizeMode="contain" />
                ))}
              </ScrollView>
              {images.length > 1 && (
                <View style={styles.dots}>
                  {images.map((_, i) => (
                    <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderEmoji}>🛒</Text>
            </View>
          )}

          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.info}>
          {product.brand ? (
            <Text style={styles.brand}>{product.brand}</Text>
          ) : null}
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.unit}>{product.unit}</Text>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product.price}</Text>
            {product.mrp > product.price && (
              <Text style={styles.mrp}>₹{product.mrp}</Text>
            )}
            {discount > 0 && (
              <View style={styles.savingBadge}>
                <Text style={styles.savingText}>Save ₹{product.mrp - product.price}</Text>
              </View>
            )}
          </View>

          {/* Stock Status */}
          <View style={[styles.stockRow, { backgroundColor: product.inStock ? "#10B98115" : "#EF444415" }]}>
            <Text style={{ fontSize: 14 }}>{product.inStock ? "✅" : "❌"}</Text>
            <Text style={[styles.stockText, { color: product.inStock ? "#10B981" : "#EF4444" }]}>
              {product.inStock ? "In Stock" : "Currently Out of Stock"}
            </Text>
          </View>

          {/* Tags */}
          {product.tags?.length > 0 && (
            <View style={styles.tags}>
              {product.tags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Description */}
          {product.description ? (
            <View style={styles.descSection}>
              <Text style={styles.descTitle}>Description</Text>
              <Text style={styles.desc}>{product.description}</Text>
            </View>
          ) : null}

          {/* Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.descTitle}>Product Details</Text>
            {[
              { label: "Category", value: [product.category, product.subcategory].filter(Boolean).join(" › ") },
              { label: "Unit", value: product.unit },
              { label: "Brand", value: product.brand || "—" },
              { label: "GST", value: `${product.gstRate}%` },
              ...(product.weight ? [{ label: "Weight", value: `${product.weight}g` }] : []),
              ...(product.barcode ? [{ label: "Barcode", value: product.barcode }] : []),
            ].map(d => (
              <View key={d.label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{d.label}</Text>
                <Text style={styles.detailValue}>{d.value}</Text>
              </View>
            ))}
          </View>

          {/* Spacer for bottom bar */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Sticky bottom Add to Cart */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPrice}>₹{product.price}</Text>
          {product.mrp > product.price && (
            <Text style={styles.bottomMrp}>₹{product.mrp}</Text>
          )}
        </View>

        {product.inStock ? (
          qty > 0 ? (
            <View style={styles.qtyControl}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(product.id, qty - 1)}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{qty}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => addItem(product)}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => addItem(product)}>
              <Text style={styles.addBtnText}>Add to Cart</Text>
            </TouchableOpacity>
          )
        ) : (
          <View style={styles.unavailableBtn}>
            <Text style={styles.unavailableText}>Out of Stock</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060A12" },
  loading: { flex: 1, backgroundColor: "#060A12", alignItems: "center", justifyContent: "center", gap: 16 },
  errorText: { color: "#6B7280", fontSize: 16 },
  backBtn: { marginTop: 8 },
  backBtnText: { color: "#10B981", fontSize: 15, fontWeight: "700" },

  imageSection: { backgroundColor: "#0C1220", position: "relative" },
  backCircle: { position: "absolute", top: 52, left: 16, zIndex: 10, width: 38, height: 38, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 19, alignItems: "center", justifyContent: "center" },
  backArrow: { color: "#fff", fontSize: 18 },
  image: { width: W, height: 300 },
  imagePlaceholder: { height: 280, alignItems: "center", justifyContent: "center", backgroundColor: "#111827" },
  imagePlaceholderEmoji: { fontSize: 72 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, paddingBottom: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#2D3D55" },
  dotActive: { backgroundColor: "#10B981", width: 18 },
  discountBadge: { position: "absolute", top: 56, right: 16, backgroundColor: "#EF4444", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  discountText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  info: { padding: 20 },
  brand: { color: "#6B7280", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  name: { color: "#fff", fontWeight: "900", fontSize: 22, lineHeight: 28, marginBottom: 4 },
  unit: { color: "#6B7280", fontSize: 14, marginBottom: 16 },

  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  price: { color: "#10B981", fontWeight: "900", fontSize: 28 },
  mrp: { color: "#4B5563", fontSize: 18, textDecorationLine: "line-through" },
  savingBadge: { backgroundColor: "#10B98120", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  savingText: { color: "#10B981", fontSize: 12, fontWeight: "700" },

  stockRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16 },
  stockText: { fontWeight: "700", fontSize: 13 },

  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  tag: { backgroundColor: "#1C2A3E", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: "#6B7280", fontSize: 12 },

  descSection: { marginBottom: 16 },
  descTitle: { color: "#9CA3AF", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  desc: { color: "#9CA3AF", fontSize: 14, lineHeight: 22 },

  detailsSection: { backgroundColor: "#0C1220", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#1C2A3E" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#1C2A3E" },
  detailLabel: { color: "#6B7280", fontSize: 13 },
  detailValue: { color: "#E8EDF8", fontSize: 13, fontWeight: "600", textAlign: "right", flex: 1, marginLeft: 16 },

  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#0C1220", borderTopWidth: 1, borderTopColor: "#1C2A3E", paddingHorizontal: 20, paddingVertical: 14, paddingBottom: 28 },
  bottomPriceCol: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  bottomPrice: { color: "#10B981", fontWeight: "900", fontSize: 22 },
  bottomMrp: { color: "#4B5563", fontSize: 14, textDecorationLine: "line-through" },
  addBtn: { backgroundColor: "#10B981", borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  addBtnText: { color: "#000", fontWeight: "900", fontSize: 15 },
  unavailableBtn: { backgroundColor: "#1C2A3E", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  unavailableText: { color: "#4B5563", fontWeight: "700", fontSize: 14 },
  qtyControl: { flexDirection: "row", alignItems: "center", backgroundColor: "#10B981", borderRadius: 14, overflow: "hidden" },
  qtyBtn: { width: 44, height: 48, alignItems: "center", justifyContent: "center" },
  qtyBtnText: { color: "#000", fontWeight: "900", fontSize: 22 },
  qtyText: { color: "#000", fontWeight: "900", fontSize: 16, paddingHorizontal: 10 },
});
