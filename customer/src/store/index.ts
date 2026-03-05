// customer/src/store/index.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Product, OrderItem, Address, User } from "../../shared/types";

// ─── Cart Store ───────────────────────────────────────────────────────────────
interface CartItem extends OrderItem {
  product: Product;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, qty?: number) => void;
  removeItem: (skuId: string) => void;
  updateQty: (skuId: string, qty: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  getItemQty: (skuId: string) => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, qty = 1) => {
        set(state => {
          const existing = state.items.find(i => i.skuId === product.id);
          if (existing) {
            return {
              items: state.items.map(i =>
                i.skuId === product.id ? { ...i, qty: i.qty + qty } : i
              ),
            };
          }
          return {
            items: [...state.items, {
              skuId: product.id,
              name: product.name,
              imageUrl: product.imageUrls?.[0] || "",
              qty,
              price: product.price,
              mrp: product.mrp,
              gst: product.gstRate,
              unit: product.unit,
              product,
            }],
          };
        });
      },

      removeItem: (skuId) =>
        set(state => ({ items: state.items.filter(i => i.skuId !== skuId) })),

      updateQty: (skuId, qty) => {
        if (qty <= 0) {
          get().removeItem(skuId);
          return;
        }
        set(state => ({
          items: state.items.map(i => i.skuId === skuId ? { ...i, qty } : i),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => {
        const { items } = get();
        const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
        return subtotal >= 500 ? subtotal : subtotal + 30;
      },

      getItemCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),

      getItemQty: (skuId) => get().items.find(i => i.skuId === skuId)?.qty || 0,
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ─── Auth Store ───────────────────────────────────────────────────────────────
interface AuthStore {
  user: User | null;
  firebaseUid: string | null;
  isLoggedIn: boolean;
  setUser: (user: User, uid: string) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      firebaseUid: null,
      isLoggedIn: false,
      setUser: (user, uid) => set({ user, firebaseUid: uid, isLoggedIn: true }),
      clearUser: () => set({ user: null, firebaseUid: null, isLoggedIn: false }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ─── App Store (ephemeral) ────────────────────────────────────────────────────
interface AppStore {
  selectedAddress: Address | null;
  selectedSlot: { date: string; slot: "AM" | "PM" } | null;
  setSelectedAddress: (address: Address) => void;
  setSelectedSlot: (slot: { date: string; slot: "AM" | "PM" }) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  selectedAddress: null,
  selectedSlot: null,
  setSelectedAddress: (address) => set({ selectedAddress: address }),
  setSelectedSlot: (slot) => set({ selectedSlot: slot }),
}));
