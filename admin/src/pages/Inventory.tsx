// admin/src/pages/Inventory.tsx
import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp, onSnapshot, addDoc, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { COLLECTIONS } from "../../../shared/config";
import { InventoryItem, Product, Store } from "../../../shared/types";
import { AlertTriangle, TrendingDown, Package, Save, Store as StoreIcon } from "lucide-react";
import { friendlyError } from "../lib/errors";

interface InventoryRow extends InventoryItem {
  docId: string;       // Firestore document ID: "{storeId}_{skuId}"
  productName: string;
  productCategory: string;
  productUnit: string;
  storeName: string;
  editing?: boolean;
  newQty?: number;
}

export default function Inventory() {
  const { staffProfile } = useAuth();
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "low" | "out" | "expiring">("all");
  const [adjustmentModal, setAdjustmentModal] = useState<{ show: boolean; row: InventoryRow | null; type: "IN" | "OUT"; qty: number; reason: string; batchNumber: string; expiryDate: string }>({
    show: false, row: null, type: "IN", qty: 0, reason: "purchase", batchNumber: "", expiryDate: ""
  });

  // Stable refs — updated on data arrival, do NOT trigger re-subscription
  const productMapRef = useRef<Record<string, Product>>({});
  const storeMapRef = useRef<Record<string, string>>({});

  // Fetch products once on mount — no real-time listener needed for enrichment
  useEffect(() => {
    getDocs(collection(db, COLLECTIONS.PRODUCTS)).then(snap => {
      const map: Record<string, Product> = {};
      snap.docs.forEach(d => { map[d.id] = { id: d.id, ...d.data() } as Product; });
      productMapRef.current = map;
    });
  }, []);

  // Real-time store listener — updates dropdown state AND the stable ref
  useEffect(() => {
    return onSnapshot(query(collection(db, COLLECTIONS.STORES)), snap => {
      const map: Record<string, string> = {};
      const list = snap.docs.map(d => {
        const s = { id: d.id, ...d.data() } as Store;
        map[d.id] = s.name;
        return s;
      });
      storeMapRef.current = map;
      setStores(list);
    });
  }, []);

  // Real-time inventory listener — depends only on selectedStore (not on stores/products arrays)
  useEffect(() => {
    const inventoryQuery = selectedStore === "all"
      ? query(collection(db, COLLECTIONS.INVENTORY), orderBy("updatedAt", "desc"))
      : query(
        collection(db, COLLECTIONS.INVENTORY),
        where("storeId", "==", selectedStore),
        orderBy("updatedAt", "desc")
      );

    return onSnapshot(inventoryQuery, snap => {
      const enriched: InventoryRow[] = snap.docs.map(d => {
        // skuId and storeId come from document data fields.
        // The document ID is the composite key "{storeId}_{skuId}".
        const data = d.data() as InventoryItem;
        return {
          ...data,
          docId: d.id,
          productName: productMapRef.current[data.skuId]?.name || data.skuId,
          productCategory: productMapRef.current[data.skuId]?.category || "—",
          productUnit: productMapRef.current[data.skuId]?.unit || "pcs",
          storeName: storeMapRef.current[data.storeId] || "Unknown Store",
          editing: false,
          newQty: data.quantity,
        };
      });
      setRows(enriched);
      setLoading(false);
    });
  }, [selectedStore]);

  const handleAdjustment = async () => {
    const { row, type, qty, reason, batchNumber, expiryDate } = adjustmentModal;
    if (!row || qty <= 0) return;

    setSaving(row.docId);
    try {
      const delta = type === "IN" ? qty : -qty;
      const newQty = Math.max(0, row.quantity + delta);
      const available = newQty - row.reserved;

      // Update Inventory doc
      const updateData: any = {
        quantity: newQty,
        available: Math.max(0, available),
        updatedBy: staffProfile?.id || "admin",
        updatedAt: serverTimestamp(),
      };

      // If adding stock, update batch/expiry on the item
      if (type === "IN" && expiryDate) {
        updateData.expiryDate = expiryDate;
        updateData.batchNumber = batchNumber || null;
        updateData.lastRestockedAt = new Date().toISOString();
      }

      await updateDoc(doc(db, COLLECTIONS.INVENTORY, row.docId), updateData);

      // Detailed Log entry
      await addDoc(collection(db, COLLECTIONS.INVENTORY_LOGS), {
        skuId: row.skuId,
        storeId: row.storeId,
        productName: row.productName,
        type,
        reason,
        batchNumber: batchNumber || null,
        expiryDate: expiryDate || null,
        previousQty: row.quantity,
        newQty,
        delta,
        updatedBy: staffProfile?.name || "admin",
        createdAt: serverTimestamp(),
      });

      // Update product global inStock
      const allInvSnap = await getDocs(query(collection(db, COLLECTIONS.INVENTORY), where("skuId", "==", row.skuId)));
      const anyInStock = allInvSnap.docs.some(d => (d.data().available ?? 0) > 0);
      await updateDoc(doc(db, COLLECTIONS.PRODUCTS, row.skuId), {
        inStock: anyInStock,
        updatedAt: serverTimestamp(),
      });

      toast.success(`${type === "IN" ? "Added" : "Removed"} ${qty} ${row.productUnit} of ${row.productName}`);
      setAdjustmentModal({ ...adjustmentModal, show: false });
    } catch (err: any) {
      toast.error(friendlyError(err, "Adjustment failed"));
    }
    setSaving(null);
  };

  const filtered = rows.filter(r => {
    if (filter === "low") return r.quantity > 0 && r.quantity <= r.lowStockThreshold;
    if (filter === "out") return r.quantity === 0;
    if (filter === "expiring" && r.expiryDate) {
      const days = (new Date(r.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      return days <= 7;
    }
    return true;
  });

  const lowCount = rows.filter(r => r.quantity > 0 && r.quantity <= r.lowStockThreshold).length;
  const outCount = rows.filter(r => r.quantity === 0).length;
  const expiringCount = rows.filter(r => {
    if (!r.expiryDate) return false;
    const days = (new Date(r.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    return days <= 7;
  }).length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-black">Inventory Control</h1>
        <p className="text-gray-500 text-sm mt-1">Real-time stock management · Updates sync instantly</p>
      </div>

      {/* Store Filter */}
      <div className="mb-6">
        <label className="text-gray-400 text-xs font-bold uppercase block mb-2 flex items-center gap-2">
          <StoreIcon size={14} />
          Filter by Store
        </label>
        <select
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-emerald-500 w-64"
        >
          <option value="all">All Stores</option>
          {stores.map(store => (
            <option key={store.id} value={store.id}>
              {store.name} ({store.code})
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total SKUs", value: rows.length, icon: Package, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Low Stock", value: lowCount, icon: TrendingDown, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
          { label: "Out of Stock", value: outCount, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
          { label: "Expiring Soon", value: expiringCount, icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} border rounded-2xl p-5`}>
            <div className="flex items-center gap-3">
              <stat.icon size={20} className={stat.color} />
              <div>
                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-gray-500 text-xs mt-0.5">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5">
        {(["all", "low", "out", "expiring"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${filter === f ? "bg-emerald-500 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
            {f === "all" ? "All Items" : f === "low" ? `Low Stock (${lowCount})` : f === "out" ? `Out of Stock (${outCount})` : `Expiring (${expiringCount})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              {["Product", "Store", "Category", "In Stock", "Expiry Status", "Batch", "Available", "Action"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const isLow = row.quantity > 0 && row.quantity <= row.lowStockThreshold;
              const isOut = row.quantity === 0;
              return (
                <tr key={`${row.skuId}-${row.storeId}`} className={`border-b border-gray-800/50 ${i % 2 === 0 ? "" : "bg-gray-900/50"}`}>
                  <td className="px-4 py-3 text-white text-sm font-semibold">{row.productName}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{row.storeName}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{row.productCategory}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold ${isOut ? "text-red-400" : isLow ? "text-yellow-400" : "text-emerald-400"}`}>
                      {row.quantity} {row.productUnit}
                    </span>
                    {(isOut || isLow) && (
                      <AlertTriangle size={12} className={`inline ml-1 ${isOut ? "text-red-400" : "text-yellow-400"}`} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {row.expiryDate ? (
                      (() => {
                        const days = (new Date(row.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
                        if (days < 0) return <span className="text-red-500 font-bold text-xs uppercase bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">Expired</span>;
                        if (days <= 7) return <span className="text-orange-400 font-bold text-xs uppercase bg-orange-400/10 px-2 py-0.5 rounded-full border border-orange-400/20">{Math.ceil(days)}d left</span>;
                        return <span className="text-gray-400 text-xs">{new Date(row.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>;
                      })()
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{row.batchNumber || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{row.available}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setAdjustmentModal({ show: true, row, type: "IN", qty: 0, reason: "purchase", batchNumber: row.batchNumber || "", expiryDate: row.expiryDate || "" })}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                    >
                      <Plus size={12} /> Adjust
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && <div className="py-12 text-center text-gray-600 text-sm">Loading inventory...</div>}
        {!loading && filtered.length === 0 && <div className="py-12 text-center text-gray-600 text-sm">No items in this filter</div>}
      </div>

      {/* Adjustment Modal */}
      {adjustmentModal.show && adjustmentModal.row && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-white font-black text-lg">Stock Adjustment</h2>
                <p className="text-gray-500 text-xs mt-0.5">{adjustmentModal.row.productName} — {adjustmentModal.row.storeName}</p>
              </div>
              <button onClick={() => setAdjustmentModal({ ...adjustmentModal, show: false })} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Type Toggle */}
              <div className="flex gap-2 p-1 bg-gray-800 rounded-xl">
                <button
                  onClick={() => setAdjustmentModal(m => ({ ...m, type: "IN", reason: "purchase" }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${adjustmentModal.type === "IN" ? "bg-emerald-500 text-black shadow-lg" : "text-gray-400 hover:text-gray-200"}`}
                >
                  <Plus size={14} /> Add Stock
                </button>
                <button
                  onClick={() => setAdjustmentModal(m => ({ ...m, type: "OUT", reason: "wastage" }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${adjustmentModal.type === "OUT" ? "bg-red-500 text-white shadow-lg" : "text-gray-400 hover:text-gray-200"}`}
                >
                  <TrendingDown size={14} /> Remove Stock
                </button>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase mb-2 block">Quantity ({adjustmentModal.row.productUnit})</label>
                <input
                  type="number"
                  autoFocus
                  value={adjustmentModal.qty || ""}
                  onChange={e => setAdjustmentModal(m => ({ ...m, qty: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  placeholder="0"
                />
              </div>

              {adjustmentModal.type === "IN" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs font-bold uppercase mb-2 block">Batch Number</label>
                    <input
                      value={adjustmentModal.batchNumber}
                      onChange={e => setAdjustmentModal(m => ({ ...m, batchNumber: e.target.value.toUpperCase() }))}
                      placeholder="B-001"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-bold uppercase mb-2 block">Expiry Date</label>
                    <input
                      type="date"
                      value={adjustmentModal.expiryDate}
                      onChange={e => setAdjustmentModal(m => ({ ...m, expiryDate: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase mb-2 block">Reason for Adjustment</label>
                <select
                  value={adjustmentModal.reason}
                  onChange={e => setAdjustmentModal(m => ({ ...m, reason: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  {adjustmentModal.type === "IN" ? (
                    <>
                      <option value="purchase">Purchase / Goods Received (GRN)</option>
                      <option value="return">Customer Return</option>
                      <option value="transfer">Inter-store Transfer IN</option>
                      <option value="correction">Inventory Correction (Audit)</option>
                    </>
                  ) : (
                    <>
                      <option value="wastage">Damage / Expiry / Wastage</option>
                      <option value="theft">Theft / Shoplifting</option>
                      <option value="transfer">Inter-store Transfer OUT</option>
                      <option value="correction">Inventory Correction (Audit)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Current Stock:</span>
                  <span className="font-mono">{adjustmentModal.row.quantity}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Adjustment:</span>
                  <span className={`font-mono font-bold ${adjustmentModal.type === "IN" ? "text-emerald-400" : "text-red-400"}`}>
                    {adjustmentModal.type === "IN" ? "+" : "-"}{adjustmentModal.qty}
                  </span>
                </div>
                <div className="h-px bg-gray-800 my-2" />
                <div className="flex justify-between text-sm text-white font-bold">
                  <span>Resulting Stock:</span>
                  <span className="font-mono">{Math.max(0, adjustmentModal.row.quantity + (adjustmentModal.type === "IN" ? adjustmentModal.qty : -adjustmentModal.qty))}</span>
                </div>
              </div>

              <button
                onClick={handleAdjustment}
                disabled={saving !== null || adjustmentModal.qty <= 0}
                className={`w-full py-4 rounded-xl font-black text-sm transition-all shadow-xl disabled:opacity-50 ${adjustmentModal.type === "IN" ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-red-500 text-white hover:bg-red-400"}`}
              >
                {saving !== null ? "Processing..." : `Confirm ${adjustmentModal.type === "IN" ? "Addition" : "Removal"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
