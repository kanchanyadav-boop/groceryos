// admin/src/pages/OrderManagement.tsx
import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, getDocs, where, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";
import { COLLECTIONS } from "../../shared/config";
import { Order, OrderStatus, Agent } from "../../shared/types";
import { format } from "date-fns";
import { Eye, Truck, X, ChevronDown } from "lucide-react";

const STATUS_COLORS: Record<OrderStatus, string> = {
  confirmed:  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  packed:     "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  dispatched: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  delivered:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cancelled:  "bg-red-500/15 text-red-400 border-red-500/30",
  refunded:   "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

const STATUS_FLOW: OrderStatus[] = ["confirmed", "packed", "dispatched", "delivered"];

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.ORDERS), orderBy("createdAt", "desc"), limit(100));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    getDocs(query(collection(db, COLLECTIONS.AGENTS), where("status", "==", "available")))
      .then(snap => setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Agent))));
  }, []);

  const updateStatus = async (orderId: string, status: OrderStatus, updatedBy = "admin") => {
    setUpdating(orderId);
    try {
      const order = orders.find(o => o.id === orderId);
      await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
        status,
        statusHistory: [
          ...(order?.statusHistory || []),
          { status, timestamp: new Date().toISOString(), updatedBy },
        ],
        updatedAt: serverTimestamp(),
      });
      toast.success(`Order marked as ${status}`);
    } catch (err: any) {
      toast.error(err.message);
    }
    setUpdating(null);
  };

  const assignAgent = async (orderId: string, agentId: string) => {
    setUpdating(orderId);
    try {
      await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
        agentId, updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, COLLECTIONS.AGENTS, agentId), {
        status: "busy", activeOrderId: orderId,
      });
      toast.success("Agent assigned");
    } catch (err: any) {
      toast.error(err.message);
    }
    setUpdating(null);
  };

  const filtered = statusFilter === "all" ? orders : orders.filter(o => o.status === statusFilter);

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-black">Order Management</h1>
        <p className="text-gray-500 text-sm mt-1">Live orders · Updates in real-time</p>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap mb-5">
        <button onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${statusFilter === "all" ? "bg-white text-black" : "bg-gray-800 text-gray-400"}`}>
          All ({orders.length})
        </button>
        {(Object.keys(STATUS_COLORS) as OrderStatus[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize border transition-colors ${statusFilter === s ? STATUS_COLORS[s] : "bg-gray-800 text-gray-500 border-transparent"}`}>
            {s} {counts[s] ? `(${counts[s]})` : ""}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              {["Order ID", "Customer", "Items", "Total", "Payment", "Slot", "Status", "Agent", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((order, i) => (
              <tr key={order.id} className={`border-b border-gray-800/50 hover:bg-gray-800/20 ${i % 2 === 0 ? "" : "bg-gray-900/50"}`}>
                <td className="px-4 py-3">
                  <span className="text-emerald-400 text-xs font-mono">#{order.id.slice(-6).toUpperCase()}</span>
                  <div className="text-gray-600 text-xs">{order.createdAt ? format(new Date(order.createdAt), "dd MMM, hh:mm a") : "—"}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-white text-sm font-semibold">{order.deliveryAddress?.label || "Customer"}</div>
                  <div className="text-gray-500 text-xs">{order.deliveryAddress?.city}</div>
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm">{order.items?.length} items</td>
                <td className="px-4 py-3 text-emerald-400 text-sm font-bold">₹{order.totalAmount}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase">{order.paymentMethod}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {order.deliverySlot?.date} · {order.deliverySlot?.slot}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {order.agentId
                    ? <span className="text-blue-400 text-xs font-semibold">Assigned</span>
                    : (
                      <select
                        onChange={e => e.target.value && assignAgent(order.id, e.target.value)}
                        disabled={updating === order.id}
                        className="bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">Assign agent</option>
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    )
                  }
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setSelectedOrder(order)}
                      className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg"><Eye size={14} /></button>
                    {/* Next status button */}
                    {STATUS_FLOW.indexOf(order.status) >= 0 && STATUS_FLOW.indexOf(order.status) < STATUS_FLOW.length - 1 && (
                      <button
                        onClick={() => updateStatus(order.id, STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1])}
                        disabled={updating === order.id}
                        className="flex items-center gap-1 px-2 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg hover:bg-emerald-500/30 disabled:opacity-50"
                      >
                        <Truck size={12} />
                        {STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1]}
                      </button>
                    )}
                    {order.status === "confirmed" && (
                      <button onClick={() => updateStatus(order.id, "cancelled")}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><X size={14} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="py-12 text-center text-gray-600 text-sm">Loading orders...</div>}
        {!loading && filtered.length === 0 && <div className="py-12 text-center text-gray-600 text-sm">No orders in this filter</div>}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-white font-black">Order #{selectedOrder.id.slice(-6).toUpperCase()}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Status Timeline */}
              <div>
                <div className="text-gray-500 text-xs font-bold uppercase mb-3">Status History</div>
                <div className="space-y-2">
                  {selectedOrder.statusHistory?.map((h, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[h.status].split(" ")[1].replace("text-", "bg-")}`}></div>
                      <span className={`text-xs font-bold capitalize ${STATUS_COLORS[h.status].split(" ")[1]}`}>{h.status}</span>
                      <span className="text-gray-600 text-xs">{h.timestamp ? format(new Date(h.timestamp), "dd MMM, hh:mm a") : ""}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="text-gray-500 text-xs font-bold uppercase mb-3">Items</div>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800">
                      <div>
                        <div className="text-white text-sm font-semibold">{item.name}</div>
                        <div className="text-gray-500 text-xs">{item.qty} × {item.unit} @ ₹{item.price}</div>
                      </div>
                      <div className="text-emerald-400 font-bold text-sm">₹{item.qty * item.price}</div>
                    </div>
                  ))}
                </div>
                <div className="pt-3 space-y-1">
                  <div className="flex justify-between text-gray-500 text-sm"><span>Subtotal</span><span>₹{selectedOrder.subtotal}</span></div>
                  <div className="flex justify-between text-gray-500 text-sm"><span>Delivery</span><span>₹{selectedOrder.deliveryFee}</span></div>
                  {selectedOrder.discount > 0 && <div className="flex justify-between text-emerald-400 text-sm"><span>Discount</span><span>-₹{selectedOrder.discount}</span></div>}
                  <div className="flex justify-between text-white font-black text-base pt-1 border-t border-gray-800"><span>Total</span><span>₹{selectedOrder.totalAmount}</span></div>
                </div>
              </div>

              {/* Address */}
              <div>
                <div className="text-gray-500 text-xs font-bold uppercase mb-2">Delivery Address</div>
                <div className="text-gray-300 text-sm leading-relaxed">
                  {selectedOrder.deliveryAddress?.line1}, {selectedOrder.deliveryAddress?.line2 && `${selectedOrder.deliveryAddress.line2}, `}
                  {selectedOrder.deliveryAddress?.city} - {selectedOrder.deliveryAddress?.pincode}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
