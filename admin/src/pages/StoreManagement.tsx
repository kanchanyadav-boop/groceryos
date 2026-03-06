// admin/src/pages/StoreManagement.tsx
import { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";
import { COLLECTIONS } from "../../../shared/config";
import { Store } from "../../../shared/types";
import { Store as StoreIcon, MapPin, Phone, Mail, Clock, Plus, Edit2, Trash2, X } from "lucide-react";

export default function StoreManagement() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    serviceablePincodes: "",
    isActive: true,
    openTime: "09:00",
    closeTime: "21:00",
  });

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.STORES));
    const unsub = onSnapshot(q, snap => {
      setStores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Store)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openModal = (store?: Store) => {
    if (store) {
      setEditingStore(store);
      setFormData({
        name: store.name,
        code: store.code,
        line1: store.address.line1,
        line2: store.address.line2 || "",
        city: store.address.city,
        state: store.address.state,
        pincode: store.address.pincode,
        phone: store.phone,
        email: store.email || "",
        serviceablePincodes: store.serviceablePincodes.join(", "),
        isActive: store.isActive,
        openTime: store.operatingHours?.open || "09:00",
        closeTime: store.operatingHours?.close || "21:00",
      });
    } else {
      setEditingStore(null);
      setFormData({
        name: "",
        code: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        pincode: "",
        phone: "",
        email: "",
        serviceablePincodes: "",
        isActive: true,
        openTime: "09:00",
        closeTime: "21:00",
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStore(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.code || !formData.line1 || !formData.city || !formData.state || !formData.pincode || !formData.phone) {
      toast.error("Please fill all required fields");
      return;
    }

    // Parse serviceable pincodes
    const pincodes = formData.serviceablePincodes
      .split(",")
      .map(p => p.trim())
      .filter(p => p.length === 6 && /^\d+$/.test(p));

    if (pincodes.length === 0) {
      toast.error("Please enter at least one valid 6-digit pincode");
      return;
    }

    const storeData = {
      name: formData.name,
      code: formData.code.toUpperCase(),
      address: {
        line1: formData.line1,
        line2: formData.line2 || undefined,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        location: { lat: 0, lng: 0 }, // TODO: Geocode address
      },
      phone: formData.phone,
      email: formData.email || undefined,
      serviceablePincodes: pincodes,
      isActive: formData.isActive,
      operatingHours: {
        open: formData.openTime,
        close: formData.closeTime,
      },
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingStore) {
        await updateDoc(doc(db, COLLECTIONS.STORES, editingStore.id), storeData);
        toast.success("Store updated successfully");
      } else {
        await addDoc(collection(db, COLLECTIONS.STORES), {
          ...storeData,
          createdAt: new Date().toISOString(),
        });
        toast.success("Store created successfully");
      }
      closeModal();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteStore = async (storeId: string) => {
    if (!confirm("Are you sure you want to delete this store?")) return;
    
    try {
      await deleteDoc(doc(db, COLLECTIONS.STORES, storeId));
      toast.success("Store deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-black">Store Management</h1>
          <p className="text-gray-500 text-sm mt-1">{stores.length} stores · Manage locations & serviceable areas</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400"
        >
          <Plus size={16} />
          Add Store
        </button>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((store) => (
          <div key={store.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center">
                  <StoreIcon size={18} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">{store.name}</h3>
                  <span className="text-gray-500 text-xs font-mono">{store.code}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openModal(store)}
                  className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => deleteStore(store.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 text-gray-400">
                <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  {store.address.line1}, {store.address.city} - {store.address.pincode}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Phone size={14} />
                <span>{store.phone}</span>
              </div>
              {store.email && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Mail size={14} />
                  <span className="truncate">{store.email}</span>
                </div>
              )}
              {store.operatingHours && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock size={14} />
                  <span>{store.operatingHours.open} - {store.operatingHours.close}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs font-bold uppercase">Serviceable Pincodes</span>
                <span className="text-emerald-400 text-xs font-bold">{store.serviceablePincodes.length}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {store.serviceablePincodes.slice(0, 6).map((pin) => (
                  <span key={pin} className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded">
                    {pin}
                  </span>
                ))}
                {store.serviceablePincodes.length > 6 && (
                  <span className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded">
                    +{store.serviceablePincodes.length - 6} more
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                store.isActive
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-gray-800 text-gray-500 border border-gray-700"
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${store.isActive ? "bg-emerald-400" : "bg-gray-500"}`}></div>
                {store.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {loading && <div className="py-12 text-center text-gray-600 text-sm">Loading stores...</div>}
      {!loading && stores.length === 0 && (
        <div className="py-12 text-center">
          <StoreIcon size={48} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-600 text-sm">No stores yet. Add your first store to get started.</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <h3 className="text-white font-black">{editingStore ? "Edit Store" : "Add New Store"}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-xs font-bold uppercase block mb-2">Store Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Green's Supermarket - Main"
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-bold uppercase block mb-2">Store Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="STR001"
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase block mb-2">Address Line 1 *</label>
                <input
                  type="text"
                  value={formData.line1}
                  onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                  placeholder="Building No, Street Name"
                  className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs font-bold uppercase block mb-2">Address Line 2</label>
                <input
                  type="text"
                  value={formData.line2}
                  onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                  placeholder="Area, Landmark"
                  className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-gray-400 text-xs font-bold uppercase block mb-2">City *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Mumbai"
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-bold uppercase block mb-2">State *</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Maharashtra"
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-bold uppercase block mb-2">Pincode *</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                    placeholder="400001"
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-xs font-bold uppercase block mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91-9999999999"
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-bold uppercase block mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="store@example.com"
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Operating Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-xs font-bold uppercase block mb-2">Opening Time</label>
                  <input
                    type="time"
                    value={formData.openTime}
                    onChange={(e) => setFormData({ ...formData, openTime: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-bold uppercase block mb-2">Closing Time</label>
                  <input
                    type="time"
                    value={formData.closeTime}
                    onChange={(e) => setFormData({ ...formData, closeTime: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Serviceable Pincodes */}
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase block mb-2">
                  Serviceable Pincodes * (comma-separated)
                </label>
                <textarea
                  value={formData.serviceablePincodes}
                  onChange={(e) => setFormData({ ...formData, serviceablePincodes: e.target.value })}
                  placeholder="400001, 400002, 400003, 400004"
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500 resize-none"
                  required
                />
                <p className="text-gray-600 text-xs mt-1">Enter 6-digit pincodes separated by commas</p>
              </div>

              {/* Status */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 bg-gray-800 border-gray-700 rounded focus:ring-emerald-500"
                  />
                  <span className="text-white text-sm font-semibold">Store is Active</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400"
                >
                  {editingStore ? "Update Store" : "Create Store"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
