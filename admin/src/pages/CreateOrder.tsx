// admin/src/pages/CreateOrder.tsx
import { useState, useEffect } from "react";
import {
  collection, query, where, getDocs, addDoc, doc, getDoc, serverTimestamp, updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";
import { COLLECTIONS } from "../../../shared/config";
import { Product, User, Address, OrderItem, PaymentMethod, DeliverySlot, Store } from "../../../shared/types";
import { findStoreByPincode } from "../../../shared/storeUtils";
import { cleanFirestoreData } from "../lib/utils";
import { Search, Plus, Minus, Trash2, Phone, MapPin, Calendar, CreditCard, X, Store as StoreIcon } from "lucide-react";

interface CartItem extends OrderItem {
  product: Product;
}

export default function CreateOrder() {
  // Customer Info
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customer, setCustomer] = useState<User | null>(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Address
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: "Home",
    line1: "",
    line2: "",
    city: "",
    pincode: "",
  });

  // Products
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Stores
  const [stores, setStores] = useState<Store[]>([]);
  const [assignedStore, setAssignedStore] = useState<Store | null>(null);

  // Order Details
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliverySlot, setDeliverySlot] = useState<DeliverySlot>("AM");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch stores on mount
  useEffect(() => {
    const fetchStores = async () => {
      const q = query(collection(db, COLLECTIONS.STORES), where("isActive", "==", true));
      const snap = await getDocs(q);
      const storeList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Store));
      setStores(storeList);
    };
    fetchStores();
  }, []);

  // Fetch products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      const q = query(
        collection(db, COLLECTIONS.PRODUCTS),
        where("inStock", "==", true)
      );
      const snap = await getDocs(q);
      const prods = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      setProducts(prods);
    };
    fetchProducts();
  }, []);

  // Search products
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode?.includes(searchTerm)
      );
      setSearchResults(filtered.slice(0, 10));
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, products]);

  // Fetch customer by phone
  const fetchCustomer = async () => {
    if (phoneNumber.length !== 10) {
      toast.error("Enter valid 10-digit phone number");
      return;
    }

    setCustomerLoading(true);
    try {
      const q = query(
        collection(db, COLLECTIONS.USERS),
        where("phone", "==", `+91${phoneNumber}`)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const userData = { id: snap.docs[0].id, ...snap.docs[0].data() } as User;
        setCustomer(userData);
        setIsNewCustomer(false);
        setCustomerName(userData.name);
        setCustomerEmail(userData.email || "");
        if (userData.addresses?.length > 0) {
          const defaultAddr = userData.addresses.find(a => a.isDefault) || userData.addresses[0];
          setSelectedAddress(defaultAddr);
        }
        toast.success("Customer found!");
      } else {
        // New customer - show form
        setCustomer(null);
        setIsNewCustomer(true);
        setCustomerName("");
        setCustomerEmail("");
        setShowAddressForm(true);
        toast("New customer - please enter details", { icon: "ℹ️" });
      }
    } catch (error: any) {
      toast.error(error.message);
    }
    setCustomerLoading(false);
  };

  // Cart functions
  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.skuId === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.skuId === product.id ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      setCart([...cart, {
        skuId: product.id,
        name: product.name,
        imageUrl: product.imageUrls?.[0] || "",
        qty: 1,
        price: product.price,
        mrp: product.mrp,
        gst: product.gstRate,
        unit: product.unit,
        product,
      }]);
    }
    setSearchTerm("");
    toast.success(`${product.name} added`);
  };

  const updateQty = (skuId: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter(item => item.skuId !== skuId));
    } else {
      setCart(cart.map(item => item.skuId === skuId ? { ...item, qty } : item));
    }
  };

  const removeFromCart = (skuId: string) => {
    setCart(cart.filter(item => item.skuId !== skuId));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = subtotal >= 500 ? 0 : 30;
  const discount = 0;
  const totalAmount = subtotal + deliveryFee - discount;

  // Create or update customer
  const saveCustomer = async (): Promise<string | null> => {
    if (isNewCustomer) {
      // Validate new customer data
      if (!customerName.trim()) {
        toast.error("Customer name is required");
        return null;
      }
      if (!newAddress.line1.trim() || !newAddress.city.trim() || !newAddress.pincode.trim()) {
        toast.error("Complete address is required");
        return null;
      }

      try {
        // Create address object
        const addressObj: Address = {
          id: `addr_${Date.now()}`,
          label: newAddress.label,
          line1: newAddress.line1,
          line2: newAddress.line2 || "",
          city: newAddress.city,
          pincode: newAddress.pincode,
          location: { lat: 0, lng: 0 },
          isDefault: true,
        };

        // Validate serviceability before creating the customer
        const store = findStoreByPincode(addressObj.pincode, stores);
        if (!store) {
          toast.error(`Pincode ${addressObj.pincode} is not serviceable`);
          return null;
        }

        // Create new user document
        const rawUserData = {
          name: customerName.trim(),
          phone: `+91${phoneNumber}`,
          email: customerEmail.trim(),
          addresses: [addressObj],
          createdAt: new Date().toISOString(),
        };

        const userData = cleanFirestoreData(rawUserData);
        const userRef = await addDoc(collection(db, COLLECTIONS.USERS), userData);

        // Set address + store for this order
        setSelectedAddress(addressObj);
        setAssignedStore(store);

        toast.success("New customer created!");
        return userRef.id;
      } catch (error: any) {
        toast.error(`Failed to create customer: ${error.message}`);
        return null;
      }
    } else if (customer) {
      // Existing customer - check if new address needs to be added
      if (showAddressForm && newAddress.line1.trim()) {
        try {
          const addressObj: Address = {
            id: `addr_${Date.now()}`,
            label: newAddress.label,
            line1: newAddress.line1,
            line2: newAddress.line2 || "",
            city: newAddress.city,
            pincode: newAddress.pincode,
            location: { lat: 0, lng: 0 },
            isDefault: false,
          };

          // Update user with new address
          const userRef = doc(db, COLLECTIONS.USERS, customer.id);
          await updateDoc(userRef, {
            addresses: [...(customer.addresses || []), addressObj],
          });

          setSelectedAddress(addressObj);

          // Auto-assign store based on pincode
          const store = findStoreByPincode(addressObj.pincode, stores);
          if (store) {
            setAssignedStore(store);
          } else {
            toast.error(`Pincode ${addressObj.pincode} is not serviceable`);
          }

          toast.success("New address added!");
        } catch (error: any) {
          toast.error(`Failed to add address: ${error.message}`);
        }
      }
      return customer.id;
    }

    return null;
  };

  // Create order
  const createOrder = async () => {
    // Guard against double-submit
    if (submitting) return;

    // Validation
    if (!phoneNumber || phoneNumber.length !== 10) {
      toast.error("Valid phone number is required");
      return;
    }
    if (cart.length === 0) {
      toast.error("Add at least one product to cart");
      return;
    }
    if (!deliveryDate) {
      toast.error("Please select delivery date");
      return;
    }

    setSubmitting(true);
    try {
      // Save customer first (create new or update existing)
      const userId = await saveCustomer();

      if (!userId) {
        setSubmitting(false);
        return;
      }

      if (!selectedAddress) {
        toast.error("Address is required");
        setSubmitting(false);
        return;
      }

      if (!assignedStore) {
        toast.error("No store services this pincode");
        setSubmitting(false);
        return;
      }

      const rawOrderData = {
        userId,
        storeId: assignedStore.id,
        status: "confirmed" as const,
        statusHistory: [{
          status: "confirmed" as const,
          timestamp: new Date().toISOString(),
          updatedBy: "admin",
          note: "Order created by admin",
        }],
        items: cart.map(({ product, ...item }) => item),
        subtotal,
        deliveryFee,
        discount,
        totalAmount,
        paymentMethod,
        paymentStatus: paymentMethod === "cod" ? "created" : "captured",
        deliveryAddress: selectedAddress,
        deliverySlot: { date: deliveryDate, slot: deliverySlot },
        notes: notes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const orderData = cleanFirestoreData(rawOrderData);
      const docRef = await addDoc(collection(db, COLLECTIONS.ORDERS), orderData);

      toast.success(`Order created! ID: ${docRef.id.slice(-6).toUpperCase()}`);

      // Reset form
      setCart([]);
      setNotes("");
      setDeliveryDate("");
      setSearchTerm("");
      setPhoneNumber("");
      setCustomer(null);
      setIsNewCustomer(false);
      setCustomerName("");
      setCustomerEmail("");
      setSelectedAddress(null);
      setShowAddressForm(false);
      setNewAddress({ label: "Home", line1: "", line2: "", city: "", pincode: "" });
      setAssignedStore(null);
    } catch (error: any) {
      toast.error(error.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-black">Create Order</h1>
        <p className="text-gray-500 text-sm mt-1">Place order on behalf of customer</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Customer & Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Search */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <Phone size={16} />
              Customer Details
            </h2>

            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                  onKeyDown={(e) => e.key === "Enter" && fetchCustomer()}
                />
              </div>
              <button
                onClick={fetchCustomer}
                disabled={customerLoading || phoneNumber.length !== 10}
                className="px-6 py-3 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {customerLoading ? "Searching..." : "Search"}
              </button>
            </div>

            {customer && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-white font-bold">{customer.name}</div>
                    <div className="text-gray-500 text-sm">{customer.phone}</div>
                    {customer.email && <div className="text-gray-500 text-xs">{customer.email}</div>}
                  </div>
                  <div className="text-emerald-400 text-xs font-bold">
                    {customer.addresses?.length || 0} addresses
                  </div>
                </div>

                {/* Address Selection */}
                {customer.addresses && customer.addresses.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-gray-400 text-xs font-bold uppercase">Delivery Address</div>
                    {customer.addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`block p-3 rounded-lg border cursor-pointer transition-colors ${selectedAddress?.id === addr.id
                            ? "bg-emerald-500/10 border-emerald-500"
                            : "bg-gray-800 border-gray-700 hover:border-gray-600"
                          }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddress?.id === addr.id}
                          onChange={() => {
                            setSelectedAddress(addr);
                            // Auto-assign store when address is selected
                            const store = findStoreByPincode(addr.pincode, stores);
                            if (store) {
                              setAssignedStore(store);
                            } else {
                              setAssignedStore(null);
                              toast.error(`Pincode ${addr.pincode} is not serviceable`);
                            }
                          }}
                          className="sr-only"
                        />
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="text-gray-500 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-white text-sm font-semibold">{addr.label}</div>
                            <div className="text-gray-400 text-xs">
                              {addr.line1}, {addr.line2 && `${addr.line2}, `}
                              {addr.city} - {addr.pincode}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* Add New Address Button */}
                <button
                  onClick={() => setShowAddressForm(!showAddressForm)}
                  className="mt-3 w-full py-2 bg-gray-800 hover:bg-gray-700 text-emerald-400 text-sm font-semibold rounded-lg border border-gray-700 transition-colors"
                >
                  {showAddressForm ? "Cancel" : "+ Add New Address"}
                </button>
              </div>
            )}

            {/* New Customer Form */}
            {isNewCustomer && (
              <div className="bg-gray-800/50 border border-emerald-500/30 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  New Customer
                </div>

                <div>
                  <label className="text-gray-400 text-xs font-bold uppercase block mb-2">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-xs font-bold uppercase block mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="text-gray-400 text-xs font-bold uppercase">Delivery Address *</div>
              </div>
            )}

            {/* Address Form */}
            {(showAddressForm || isNewCustomer) && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs font-bold uppercase block mb-2">
                      Label
                    </label>
                    <select
                      value={newAddress.label}
                      onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Home">Home</option>
                      <option value="Work">Work</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-xs font-bold uppercase block mb-2">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    value={newAddress.line1}
                    onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                    placeholder="House/Flat No, Building Name"
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-xs font-bold uppercase block mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={newAddress.line2}
                    onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
                    placeholder="Street, Area, Landmark"
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs font-bold uppercase block mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      placeholder="City"
                      className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-xs font-bold uppercase block mb-2">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      value={newAddress.pincode}
                      onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                      placeholder="123456"
                      className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Product Search & Cart */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <Search size={16} />
              Add Products
            </h2>

            {/* Search */}
            <div className="relative mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, brand, or barcode..."
                className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl max-h-64 overflow-y-auto z-10">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 text-left border-b border-gray-700 last:border-0"
                    >
                      {product.imageUrls?.[0] ? (
                        <img src={product.imageUrls[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-xl">
                          🛒
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-white text-sm font-semibold">{product.name}</div>
                        <div className="text-gray-500 text-xs">{product.unit} · {product.brand}</div>
                      </div>
                      <div className="text-emerald-400 font-bold">₹{product.price}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Items */}
            {cart.length > 0 ? (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.skuId} className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
                    ) : (
                      <div className="w-14 h-14 bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
                        🛒
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-white text-sm font-semibold">{item.name}</div>
                      <div className="text-gray-500 text-xs">{item.unit} · ₹{item.price}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.skuId, item.qty - 1)}
                        className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-white font-bold w-8 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.skuId, item.qty + 1)}
                        className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.skuId)}
                        className="w-8 h-8 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg flex items-center justify-center ml-2"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="text-emerald-400 font-bold min-w-[60px] text-right">
                      ₹{item.price * item.qty}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-600">
                <Search size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Search and add products to cart</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="space-y-6">
          {/* Delivery Details */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <Calendar size={16} />
              Delivery Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase block mb-2">
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs font-bold uppercase block mb-2">
                  Time Slot
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["AM", "PM"] as DeliverySlot[]).map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setDeliverySlot(slot)}
                      className={`py-3 rounded-xl font-bold text-sm transition-colors ${deliverySlot === slot
                          ? "bg-emerald-500 text-black"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                    >
                      {slot === "AM" ? "Morning (8AM-12PM)" : "Evening (4PM-8PM)"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <CreditCard size={16} />
              Payment Method
            </h2>

            <div className="space-y-2">
              {(["cod", "upi", "card"] as PaymentMethod[]).map((method) => (
                <label
                  key={method}
                  className={`block p-3 rounded-xl border cursor-pointer transition-colors ${paymentMethod === method
                      ? "bg-emerald-500/10 border-emerald-500"
                      : "bg-gray-800 border-gray-700 hover:border-gray-600"
                    }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                    className="sr-only"
                  />
                  <div className="text-white text-sm font-semibold uppercase">{method}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-bold mb-4">Order Summary</h2>

            <div className="space-y-3">
              <div className="flex justify-between text-gray-400 text-sm">
                <span>Items ({cart.length})</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-400 text-sm">
                <span>Delivery Fee</span>
                <span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-400 text-sm">
                  <span>Discount</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className="border-t border-gray-800 pt-3 flex justify-between text-white font-black text-lg">
                <span>Total</span>
                <span>₹{totalAmount}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="text-gray-400 text-xs font-bold uppercase block mb-2">
                Order Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any special instructions..."
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500 resize-none text-sm"
              />
            </div>

            {/* Create Order Button */}
            <button
              onClick={createOrder}
              disabled={submitting || cart.length === 0 || !deliveryDate || phoneNumber.length !== 10}
              className="w-full mt-4 py-4 bg-emerald-500 text-black font-black rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Creating Order..." : "Create Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
