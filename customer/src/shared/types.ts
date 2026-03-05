// ─── SHARED TYPES — used by customer app, agent app, admin panel, and Cloud Functions ───

export type UserRole = "admin" | "inventory_manager" | "dispatcher" | "billing" | "support";
export type OrderStatus = "confirmed" | "packed" | "dispatched" | "delivered" | "cancelled" | "refunded";
export type PaymentMethod = "upi" | "card" | "wallet" | "cod";
export type PaymentStatus = "created" | "authorized" | "captured" | "failed" | "refunded";
export type RefundStatus = "pending" | "approved" | "processed" | "rejected";
export type AgentStatus = "available" | "busy" | "offline";
export type DeliverySlot = "AM" | "PM";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Address {
  id: string;
  label: string; // Home, Work, Other
  line1: string;
  line2?: string;
  city: string;
  pincode: string;
  location: GeoPoint;
  isDefault: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  subcategory?: string;
  price: number;       // selling price
  mrp: number;         // max retail price
  unit: string;        // kg, litre, pcs, dozen
  imageUrls: string[];
  description: string;
  brand: string;
  inStock: boolean;
  tags: string[];
  gstRate: number;     // 5 | 12 | 18
  weight?: number;     // in grams
  barcode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  skuId: string;
  quantity: number;
  reserved: number;       // qty reserved for pending orders
  available: number;      // quantity - reserved
  lowStockThreshold: number;
  lastRestockedAt?: string;
  updatedBy: string;
  updatedAt: string;
}

export interface OrderItem {
  skuId: string;
  name: string;
  imageUrl: string;
  qty: number;
  price: number;
  mrp: number;
  gst: number;
  unit: string;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  updatedBy: string; // userId or "system"
  note?: string;
}

export interface Order {
  id: string;
  userId: string;
  agentId?: string;
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  paymentId?: string;
  paymentMethod: PaymentMethod;
  deliveryAddress: Address;
  deliverySlot: { date: string; slot: DeliverySlot };
  expectedEta?: string;
  proofOfDelivery?: { type: "otp" | "photo"; value: string };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  addresses: Address[];
  fcmToken?: string;
  createdAt: string;
  lastOrderAt?: string;
}

export interface Agent {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  status: AgentStatus;
  location?: GeoPoint;
  locationUpdatedAt?: string;
  activeOrderId?: string;
  fcmToken?: string;
  totalDeliveries: number;
  rating: number;
}

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  status: PaymentStatus;
  method: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  createdAt: string;
}

export interface Refund {
  id: string;
  orderId: string;
  paymentId: string;
  userId: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  razorpayRefundId?: string;
  approvedBy?: string;
  createdAt: string;
  processedAt?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface DeliverySlotConfig {
  date: string;
  AM: { capacity: number; booked: number; cutoffTime: string };
  PM: { capacity: number; booked: number; cutoffTime: string };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  subcategories: { id: string; name: string; slug: string }[];
  sortOrder: number;
}
