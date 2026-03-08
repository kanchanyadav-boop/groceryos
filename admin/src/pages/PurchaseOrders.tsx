// admin/src/pages/PurchaseOrders.tsx
import { useState, useEffect } from "react";
import {
    collection, query, orderBy, getDocs, doc, addDoc, updateDoc,
    serverTimestamp, where, writeBatch, onSnapshot
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { COLLECTIONS } from "../../../shared/config";
import { PurchaseOrder, POItem, Vendor, Product, Store, POStatus } from "../../../shared/types";
import { friendlyError } from "../lib/errors";
import {
    FileText, Plus, Truck, CheckCircle, XCircle,
    Eye, Package, Calendar, User, Store as StoreIcon,
    ChevronRight, ArrowLeft, Save, AlertTriangle, Search
} from "lucide-react";
import { format } from "date-fns";

const STATUS_BADGE: Record<POStatus, string> = {
    draft: "bg-gray-500/15 text-gray-400 border-gray-500/30",
    pending: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    partially_received: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    received: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function PurchaseOrders() {
    const { staffProfile } = useAuth();
    const [pos, setPos] = useState<PurchaseOrder[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"list" | "create" | "receive">("list");
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

    // Form State for Creation
    const [newPO, setNewPO] = useState<{ vendorId: string; storeId: string; items: POItem[]; notes: string }>({
        vendorId: "", storeId: "", items: [], notes: ""
    });

    // Receiving State
    const [receivingItems, setReceivingItems] = useState<POItem[]>([]);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                await loadData();
            } catch (err: any) {
                console.error("Failed to load PO metadata:", err);
                toast.error("Failed to load vendors/stores. Check console.");
            }
        };

        fetchAll();

        const q = query(collection(db, COLLECTIONS.PURCHASE_ORDERS), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q,
            (snap) => {
                setPos(snap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder)));
                setLoading(false);
            },
            (err) => {
                console.error("PO Subscription Error:", err);
                toast.error("Permission denied or missing index for Purchase Orders.");
                setLoading(false);
            }
        );
        return unsub;
    }, []);

    const loadData = async () => {
        const [vSnap, sSnap, pSnap] = await Promise.all([
            getDocs(collection(db, COLLECTIONS.VENDORS)),
            getDocs(query(collection(db, COLLECTIONS.STORES), where("isActive", "==", true))),
            getDocs(collection(db, COLLECTIONS.PRODUCTS))
        ]);
        setVendors(vSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
        setStores(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Store)));
        setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));

        // Seed vendors if empty
        if (vSnap.empty) {
            await addDoc(collection(db, COLLECTIONS.VENDORS), {
                name: "Main Wholesale Hub", contactPerson: "Rajesh", phone: "9876543210",
                isActive: true, categories: ["FMCG", "Grains"], createdAt: new Date().toISOString()
            });
        }
    };

    // ─── PO Creation ────────────────────────────────────────────────────────────
    const addItemToPO = (product: Product) => {
        if (newPO.items.find(i => i.skuId === product.id)) return;
        setNewPO(prev => ({
            ...prev,
            items: [...prev.items, {
                skuId: product.id, productName: product.name, unit: product.unit,
                orderedQty: 1, receivedQty: 0, unitCost: product.price * 0.8 // Dummy cost
            }]
        }));
    };

    const createPO = async () => {
        if (!newPO.vendorId || !newPO.storeId || newPO.items.length === 0) {
            toast.error("Please select vendor, store and at least one item");
            return;
        }
        try {
            const subtotal = newPO.items.reduce((sum, i) => sum + (i.orderedQty * i.unitCost), 0);
            const totalAmount = subtotal * 1.05; // 5% tax dummy
            const poNum = `PO-${format(new Date(), "yyyyMM")}-${Math.floor(1000 + Math.random() * 9000)}`;

            await addDoc(collection(db, COLLECTIONS.PURCHASE_ORDERS), {
                ...newPO,
                poNumber: poNum,
                status: "pending",
                subtotal,
                taxAmount: totalAmount - subtotal,
                totalAmount,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            toast.success("Purchase Order Created");
            setView("list");
            setNewPO({ vendorId: "", storeId: "", items: [], notes: "" });
        } catch (err: any) {
            toast.error(friendlyError(err, "Failed to create PO"));
        }
    };

    // ─── Smart Receiving Logic ──────────────────────────────────────────────────
    const openReceive = (po: PurchaseOrder) => {
        setSelectedPO(po);
        setReceivingItems(po.items.map(i => ({ ...i })));
        setView("receive");
    };

    const processReceipt = async () => {
        if (!selectedPO) return;
        const batch = writeBatch(db);
        try {
            const allReceived = receivingItems.every(i => i.receivedQty >= i.orderedQty);
            const anyReceived = receivingItems.some(i => i.receivedQty > 0);
            const status: POStatus = allReceived ? "received" : anyReceived ? "partially_received" : "pending";

            // 1. Update PO Status and Item Data
            batch.update(doc(db, COLLECTIONS.PURCHASE_ORDERS, selectedPO.id), {
                status,
                items: receivingItems,
                receivedAt: serverTimestamp(),
                receivedBy: staffProfile?.name || "admin",
                updatedAt: serverTimestamp()
            });

            // 2. Update Inventory for each item received
            for (const item of receivingItems) {
                if (item.receivedQty > 0) {
                    const invRef = doc(db, COLLECTIONS.INVENTORY, `${selectedPO.storeId}_${item.skuId}`);

                    // Get current stock
                    const invSnap = await getDocs(query(collection(db, COLLECTIONS.INVENTORY),
                        where("skuId", "==", item.skuId),
                        where("storeId", "==", selectedPO.storeId)));

                    if (!invSnap.empty) {
                        const invData = invSnap.docs[0].data();
                        const newTotal = invData.quantity + item.receivedQty;
                        batch.update(invRef, {
                            quantity: newTotal,
                            available: newTotal - (invData.reserved || 0),
                            batchNumber: item.batchNumber || invData.batchNumber || null,
                            expiryDate: item.expiryDate || invData.expiryDate || null,
                            updatedAt: serverTimestamp()
                        });

                        // Log movement
                        const logRef = doc(collection(db, COLLECTIONS.INVENTORY_LOGS));
                        batch.set(logRef, {
                            skuId: item.skuId,
                            storeId: selectedPO.storeId,
                            productName: item.productName,
                            type: "IN",
                            reason: "purchase",
                            delta: item.receivedQty,
                            previousQty: invData.quantity,
                            newQty: newTotal,
                            updatedBy: staffProfile?.name || "admin",
                            note: `PO Receipt: ${selectedPO.poNumber}`,
                            createdAt: serverTimestamp()
                        });
                    }
                }
            }

            await batch.commit();
            toast.success("Goods Received Successfully");
            setView("list");
        } catch (err: any) {
            toast.error(friendlyError(err, "Receipt failed"));
        }
    };

    if (loading) return <div className="p-10 text-center text-emerald-500">Loading Orders...</div>;

    return (
        <div className="p-6 max-w-6xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-white text-3xl font-black">Purchase Orders</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage vendor procurement and smart inventory loading</p>
                </div>
                {view === "list" ? (
                    <button onClick={() => setView("create")} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/10">
                        <Plus size={18} /> New Purchase Order
                    </button>
                ) : (
                    <button onClick={() => setView("list")} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-400 hover:text-white rounded-xl transition-colors">
                        <ArrowLeft size={16} /> Back to List
                    </button>
                )}
            </div>

            {/* ─── LIST VIEW ────────────────────────────────────────────────────────── */}
            {view === "list" && (
                <div className="grid grid-cols-1 gap-4">
                    {pos.map(po => (
                        <div key={po.id} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <div className="text-white font-bold text-lg">{po.poNumber}</div>
                                        <div className="flex items-center gap-2 text-gray-500 text-xs mt-0.5">
                                            <Truck size={12} /> {vendors.find(v => v.id === po.vendorId)?.name || "Vendor"}
                                            <span className="mx-1">•</span>
                                            <StoreIcon size={12} /> {stores.find(s => s.id === po.storeId)?.name || "Store"}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${STATUS_BADGE[po.status]}`}>
                                        {po.status.replace("_", " ")}
                                    </span>
                                    <div className="text-white font-black mt-2">₹{po.totalAmount.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                                <div className="text-gray-500 text-xs">
                                    {po.items.length} items ordered • Created {format(new Date(po.createdAt as any), "dd MMM, yyyy")}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openReceive(po)} disabled={po.status === "received" || po.status === "cancelled"}
                                        className="flex items-center gap-2 px-4 py-1.5 bg-gray-800 text-white text-xs font-bold rounded-lg hover:bg-gray-700 disabled:opacity-30">
                                        <Package size={14} /> Receive Goods
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {pos.length === 0 && <div className="py-20 text-center text-gray-600">No purchase orders found. Click "New PO" to start.</div>}
                </div>
            )}

            {/* ─── CREATE VIEW ──────────────────────────────────────────────────────── */}
            {view === "create" && (
                <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 space-y-6">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                            <h2 className="text-white font-bold mb-4 flex items-center gap-2"><Package size={18} className="text-emerald-500" /> Order Items</h2>

                            <div className="relative mb-6">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search products to add..."
                                    className="w-full bg-gray-800 border-none rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:ring-1 focus:ring-emerald-500"
                                    onChange={(e) => {
                                        const val = (e.target.nextSibling as any); // Simple search mock
                                    }}
                                />
                                <div className="max-h-48 overflow-y-auto bg-gray-800 mt-2 rounded-xl border border-gray-700">
                                    {products.slice(0, 10).map(p => (
                                        <button key={p.id} onClick={() => addItemToPO(p)} className="w-full text-left px-4 py-2 hover:bg-emerald-500/10 text-white text-xs border-b border-gray-700">
                                            {p.name} ({p.unit})
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <table className="w-full">
                                <thead className="text-gray-500 text-[10px] uppercase font-bold border-b border-gray-800">
                                    <tr>
                                        <th className="text-left py-3 px-2">Item</th>
                                        <th className="text-center py-3 px-2 w-24">Qty</th>
                                        <th className="text-right py-3 px-2 w-32">Unit Cost</th>
                                        <th className="text-right py-3 px-2 w-32">Total</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/50">
                                    {newPO.items.map((item, idx) => (
                                        <tr key={item.skuId}>
                                            <td className="py-4 px-2 text-white font-medium text-sm">{item.productName}</td>
                                            <td className="py-4 px-2">
                                                <input
                                                    type="number"
                                                    value={item.orderedQty}
                                                    onChange={(e) => {
                                                        const items = [...newPO.items];
                                                        items[idx].orderedQty = parseInt(e.target.value) || 0;
                                                        setNewPO(prev => ({ ...prev, items }));
                                                    }}
                                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-1 px-2 text-white text-center text-sm"
                                                />
                                            </td>
                                            <td className="py-4 px-2 text-right">
                                                <input
                                                    type="number"
                                                    value={item.unitCost}
                                                    onChange={(e) => {
                                                        const items = [...newPO.items];
                                                        items[idx].unitCost = parseFloat(e.target.value) || 0;
                                                        setNewPO(prev => ({ ...prev, items }));
                                                    }}
                                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-1 px-2 text-white text-right text-sm"
                                                />
                                            </td>
                                            <td className="py-4 px-2 text-right text-gray-300 font-bold text-sm">₹{(item.orderedQty * item.unitCost).toLocaleString()}</td>
                                            <td className="py-4 px-2 text-right">
                                                <button onClick={() => setNewPO(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))} className="text-gray-600 hover:text-red-400">
                                                    <XCircle size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                            <h2 className="text-white font-bold mb-4 flex items-center gap-2"><Truck size={18} className="text-emerald-500" /> Header Info</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-gray-500 text-[10px] font-bold uppercase mb-1.5 block">Vendor</label>
                                    <select
                                        value={newPO.vendorId}
                                        onChange={e => setNewPO(prev => ({ ...prev, vendorId: e.target.value }))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-emerald-500"
                                    >
                                        <option value="">Select Vendor</option>
                                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-500 text-[10px] font-bold uppercase mb-1.5 block">Receiving Store</label>
                                    <select
                                        value={newPO.storeId}
                                        onChange={e => setNewPO(prev => ({ ...prev, storeId: e.target.value }))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-emerald-500"
                                    >
                                        <option value="">Select Store</option>
                                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-500 text-[10px] font-bold uppercase mb-1.5 block">Notes</label>
                                    <textarea
                                        rows={3}
                                        value={newPO.notes}
                                        onChange={e => setNewPO(prev => ({ ...prev, notes: e.target.value }))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-emerald-500 resize-none"
                                        placeholder="Delivery instructions..."
                                    />
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-800 space-y-2">
                                <div className="flex justify-between text-gray-500 text-sm">
                                    <span>Subtotal:</span>
                                    <span>₹{newPO.items.reduce((sum, i) => sum + (i.orderedQty * i.unitCost), 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-white font-black text-lg">
                                    <span>Grand Total:</span>
                                    <span>₹{(newPO.items.reduce((sum, i) => sum + (i.orderedQty * i.unitCost), 0) * 1.05).toLocaleString()}</span>
                                </div>
                            </div>

                            <button onClick={createPO} className="w-full mt-6 py-4 bg-emerald-500 text-black font-black rounded-xl hover:bg-emerald-400 transition-all shadow-xl">
                                Confirm & Create PO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── RECEIVE VIEW ─────────────────────────────────────────────────────── */}
            {view === "receive" && selectedPO && (
                <div className="space-y-6">
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5 flex items-start gap-4">
                        <AlertTriangle className="text-orange-400 shrink-0 mt-1" size={20} />
                        <div>
                            <h3 className="text-orange-400 font-bold">Smart Goods Receipt</h3>
                            <p className="text-gray-500 text-sm mt-0.5">Input the *actual* amount received. Inventory will be updated based on these figures.</p>
                        </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                        <table className="w-full">
                            <thead className="text-gray-500 text-[10px] uppercase font-bold border-b border-gray-800">
                                <tr>
                                    <th className="text-left py-4 px-6">Product</th>
                                    <th className="text-center py-4 px-4 w-32">Ordered</th>
                                    <th className="text-center py-4 px-4 w-32">Received</th>
                                    <th className="text-center py-4 px-4 w-40">Batch No</th>
                                    <th className="text-center py-4 px-4 w-40">Expiry</th>
                                    <th className="text-right py-4 px-6">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {receivingItems.map((item, idx) => {
                                    const isMatching = item.receivedQty === item.orderedQty;
                                    return (
                                        <tr key={item.skuId}>
                                            <td className="py-5 px-6">
                                                <div className="text-white font-semibold">{item.productName}</div>
                                                <div className="text-gray-500 text-xs">{item.unit}</div>
                                            </td>
                                            <td className="py-5 px-4 text-center text-gray-400">{item.orderedQty}</td>
                                            <td className="py-5 px-4 text-center">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={item.orderedQty}
                                                    value={item.receivedQty}
                                                    onChange={(e) => {
                                                        const items = [...receivingItems];
                                                        items[idx].receivedQty = Math.min(
                                                            Math.max(0, parseInt(e.target.value) || 0),
                                                            item.orderedQty
                                                        );
                                                        setReceivingItems(items);
                                                    }}
                                                    className={`w-full bg-gray-800 border rounded-xl py-2 px-3 text-center text-white focus:ring-1 ${isMatching ? "border-gray-700" : "border-orange-500"}`}
                                                />
                                            </td>
                                            <td className="py-5 px-4 text-center">
                                                <input type="text" placeholder="Batch ID" onChange={e => {
                                                    const items = [...receivingItems];
                                                    items[idx].batchNumber = e.target.value;
                                                    setReceivingItems(items);
                                                }} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-1.5 px-3 text-white text-xs font-mono" />
                                            </td>
                                            <td className="py-5 px-4 text-center">
                                                <input type="date" onChange={e => {
                                                    const items = [...receivingItems];
                                                    items[idx].expiryDate = e.target.value;
                                                    setReceivingItems(items);
                                                }} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-1.5 px-3 text-white text-xs" />
                                            </td>
                                            <td className="py-5 px-6 text-right">
                                                {isMatching ? <span className="text-emerald-500 text-[10px] font-black uppercase">Match</span> : <span className="text-orange-400 text-[10px] font-black uppercase">Adjusted</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="p-8 border-t border-gray-800 flex justify-end gap-4">
                            <button onClick={() => setView("list")} className="px-6 py-3 bg-gray-800 text-gray-400 font-bold rounded-xl">Cancel</button>
                            <button onClick={processReceipt} className="px-10 py-3 bg-emerald-500 text-black font-black rounded-xl shadow-xl shadow-emerald-500/20">Confirm Receipt</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
