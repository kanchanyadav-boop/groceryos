// admin/src/pages/Inventory.tsx
import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { COLLECTIONS } from "../../shared/config";
import { InventoryItem, Product } from "../../shared/types";
import { AlertTriangle, TrendingDown, Package, Save } from "lucide-react";

interface InventoryRow extends InventoryItem {
  productName: string;
  productCategory: string;
  productUnit: string;
  editing?: boolean;
  newQty?: number;
}

export default function Inventory() {
  const { staffProfile } = useAuth();
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  useEffect(() => {
    // Real-time inventory listener
    const unsubscribe = onSnapshot(
      query(collection(db, COLLECTIONS.INVENTORY), orderBy("updatedAt", "desc")),
      async (snap) => {
        // Fetch product names in parallel
        const invItems = snap.docs.map(d => ({ skuId: d.id, ...d.data() } as InventoryItem));

        // Get product details
        const productSnap = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
        const productMap: Record<string, Product> = {};
        productSnap.docs.forEach(d => { productMap[d.id] = { id: d.id, ...d.data() } as Product; });

        const enriched: InventoryRow[] = invItems.map(item => ({
          ...item,
          productName: productMap[item.skuId]?.name || item.skuId,
          productCategory: productMap[item.skuId]?.category || "—",
          productUnit: productMap[item.skuId]?.unit || "pcs",
          editing: false,
          newQty: item.quantity,
        }));

        setRows(enriched);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const updateQty = (skuId: string, val: number) => {
    setRows(prev => prev.map(r => r.skuId === skuId ? { ...r, newQty: val } : r));
  };

  const saveQty = async (row: InventoryRow) => {
    if (row.newQty === undefined || row.newQty < 0) return;
    setSaving(row.skuId);
    try {
      const newQty = row.newQty;
      const available = newQty - row.reserved;

      await updateDoc(doc(db, COLLECTIONS.INVENTORY, row.skuId), {
        quantity: newQty,
        available: Math.max(0, available),
        updatedBy: staffProfile?.id || "admin",
        updatedAt: serverTimestamp(),
      });

      // Log the change
      await addDoc(collection(db, COLLECTIONS.INVENTORY_LOGS), {
        skuId: row.skuId,
        previousQty: row.quantity,
        newQty,
        delta: newQty - row.quantity,
        updatedBy: staffProfile?.name || "admin",
        reason: "manual_update",
        createdAt: serverTimestamp(),
      });

      // Update product inStock flag
      await updateDoc(doc(db, COLLECTIONS.PRODUCTS, row.skuId), {
        inStock: newQty > 0,
        updatedAt: serverTimestamp(),
      });

      toast.success(`Stock updated: ${row.productName}`);
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(null);
  };

  const filtered = rows.filter(r => {
    if (filter === "low") return r.quantity > 0 && r.quantity <= r.lowStockThreshold;
    if (filter === "out") return r.quantity === 0;
    return true;
  });

  const lowCount = rows.filter(r => r.quantity > 0 && r.quantity <= r.lowStockThreshold).length;
  const outCount = rows.filter(r => r.quantity === 0).length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-black">Inventory Control</h1>
        <p className="text-gray-500 text-sm mt-1">Real-time stock management · Updates sync instantly</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total SKUs", value: rows.length, icon: Package, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Low Stock", value: lowCount, icon: TrendingDown, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
          { label: "Out of Stock", value: outCount, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
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
        {(["all", "low", "out"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${filter === f ? "bg-emerald-500 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
            {f === "all" ? "All Items" : f === "low" ? `Low Stock (${lowCount})` : `Out of Stock (${outCount})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              {["Product", "Category", "Unit", "In Stock", "Reserved", "Available", "Low Stock At", "Update Qty"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const isLow = row.quantity > 0 && row.quantity <= row.lowStockThreshold;
              const isOut = row.quantity === 0;
              return (
                <tr key={row.skuId} className={`border-b border-gray-800/50 ${i % 2 === 0 ? "" : "bg-gray-900/50"}`}>
                  <td className="px-4 py-3 text-white text-sm font-semibold">{row.productName}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{row.productCategory}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{row.productUnit}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold ${isOut ? "text-red-400" : isLow ? "text-yellow-400" : "text-emerald-400"}`}>
                      {row.quantity}
                    </span>
                    {(isOut || isLow) && (
                      <AlertTriangle size={12} className={`inline ml-1 ${isOut ? "text-red-400" : "text-yellow-400"}`} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{row.reserved}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{row.available}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{row.lowStockThreshold}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={row.newQty ?? row.quantity}
                        onChange={e => updateQty(row.skuId, parseInt(e.target.value) || 0)}
                        className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500 text-center"
                      />
                      <button
                        onClick={() => saveQty(row)}
                        disabled={saving === row.skuId || row.newQty === row.quantity}
                        className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 disabled:opacity-30 transition-colors"
                      >
                        {saving === row.skuId ? "..." : <Save size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && <div className="py-12 text-center text-gray-600 text-sm">Loading inventory...</div>}
        {!loading && filtered.length === 0 && <div className="py-12 text-center text-gray-600 text-sm">No items in this filter</div>}
      </div>
    </div>
  );
}
