// customer/src/components/ProductCard.tsx
// Shared product card used on Home, Category, and Search screens.
// Keeps size, alignment, and button position consistent everywhere.
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { router } from "expo-router";
import { useCartStore } from "../store";
import { Product } from "../shared/types";

const { width } = Dimensions.get("window");
export const CARD_WIDTH = width * 0.32; // used for horizontal lists
export const CARD_HEIGHT = 185; // Fixed height for absolute alignment in grids

interface Props {
    product: Product;
    /** Set to true when used in a horizontal FlatList (e.g. home page rows) */
    horizontal?: boolean;
    /** Optional overlay badge (e.g. "Ordered 2×") */
    badge?: string;
}

export default function ProductCard({ product, horizontal = false, badge }: Props) {
    const { addItem, updateQty, getItemQty } = useCartStore();
    const qty = getItemQty(product.id);
    const discount = product.mrp > product.price
        ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
        : 0;

    return (
        <TouchableOpacity
            style={[
                styles.card,
                horizontal && { width: CARD_WIDTH, height: CARD_HEIGHT, flex: 0 }
            ]}
            onPress={() => router.push(`/product/${product.id}`)}
            activeOpacity={0.8}
        >
            {/* Image */}
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
                {badge && (
                    <View style={styles.orderBadge}>
                        <Text style={styles.orderBadgeText}>{badge}</Text>
                    </View>
                )}
                {!product.inStock && (
                    <View style={styles.outOfStockOverlay}>
                        <Text style={styles.outOfStockText}>Out of Stock</Text>
                    </View>
                )}
            </View>

            {/* Body — flex so button is always pinned at the bottom */}
            <View style={styles.cardBody}>
                <View style={styles.cardTextContent}>
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    <Text style={styles.productUnit}>{product.unit}</Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>₹{product.price}</Text>
                        {product.mrp > product.price && (
                            <Text style={styles.mrp}>₹{product.mrp}</Text>
                        )}
                    </View>
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

export const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: "#16181F",
        borderRadius: 14,
        overflow: "hidden",
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#262830",
    },
    imageContainer: { position: "relative" },
    image: { width: "100%", height: 90 },
    imageFallback: { backgroundColor: "#262830", alignItems: "center", justifyContent: "center" },
    imageFallbackText: { fontSize: 30 },
    discountBadge: {
        position: "absolute", top: 6, left: 6,
        backgroundColor: "#E05252", borderRadius: 5,
        paddingHorizontal: 5, paddingVertical: 2,
    },
    discountText: { color: "#fff", fontSize: 9, fontWeight: "700" },
    outOfStockOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.6)",
        alignItems: "center", justifyContent: "center",
    },
    outOfStockText: { color: "#fff", fontWeight: "700", fontSize: 11 },

    // flex layout pins button at bottom regardless of name length
    cardBody: { flex: 1, padding: 7, justifyContent: "space-between" },
    cardTextContent: { flex: 1 },
    productName: { color: "#F0F0F5", fontSize: 11, fontWeight: "600", lineHeight: 15 },
    productUnit: { color: "#4E4E60", fontSize: 9, marginTop: 1 },
    priceRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    price: { color: "#2ECC71", fontWeight: "900", fontSize: 13 },
    mrp: { color: "#4E4E60", fontSize: 10, textDecorationLine: "line-through" },

    addBtn: {
        marginTop: 5,
        backgroundColor: "#2ECC7120",
        borderWidth: 1, borderColor: "#2ECC71",
        borderRadius: 7, paddingVertical: 5,
        alignItems: "center",
    },
    addBtnText: { color: "#2ECC71", fontWeight: "700", fontSize: 11 },
    addBtnDisabled: {
        marginTop: 5, backgroundColor: "#262830",
        borderRadius: 7, paddingVertical: 5, alignItems: "center",
    },
    addBtnDisabledText: { color: "#4E4E60", fontWeight: "600", fontSize: 10 },
    qtyControl: {
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-between", marginTop: 5,
        backgroundColor: "#2ECC71", borderRadius: 7, overflow: "hidden",
    },
    qtyBtn: { width: 28, height: 26, alignItems: "center", justifyContent: "center" },
    qtyBtnText: { color: "#000", fontWeight: "900", fontSize: 15, lineHeight: 17 },
    qtyText: { color: "#000", fontWeight: "900", fontSize: 13 },
    orderBadge: {
        position: "absolute", top: 6, right: 6,
        backgroundColor: "#2ECC71", borderRadius: 5,
        paddingHorizontal: 5, paddingVertical: 2,
    },
    orderBadgeText: { color: "#000", fontSize: 9, fontWeight: "800" },
});
