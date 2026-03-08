// admin/src/pages/OrderManagement.tsx
import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, where, limit, arrayUnion, Timestamp } from "firebase/firestore";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";
import { COLLECTIONS } from "../../shared/config";
import { Order, OrderStatus, Agent, Store } from "../../shared/types";
import { fmtDate } from "../lib/utils";
import { Eye, Truck, X, Store as StoreIcon } from "lucide-react";
import { friendlyError } from "../lib/errors";

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
  const [stores, setStores] = useState<Store[]>([]);
  const [assigningOrder, setAssigningOrder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  // Default to today; format as YYYY-MM-DD for the date input
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    setLoading(true);
    const day = new Date(selectedDate + "T00:00:00");
    const from = Timestamp.fromDate(startOfDay(day));
    const to   = Timestamp.fromDate(endOfDay(day));
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where("createdAt", ">=", from),
      where("createdAt", "<=", to),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      setLoading(false);
    });
    return () => unsub();
  }, [selectedDate]);

  // All agents — admin can assign any order to any agent regardless of status
  useEffect(() => {
    return onSnapshot(collection(db, COLLECTIONS.AGENTS), snap => {
      setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Agent)));
    });
  }, []);

  // Real-time stores
  useEffect(() => {
    return onSnapshot(collection(db, COLLECTIONS.STORES), snap => {
      setStores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Store)));
    });
  }, []);

  // Build pincode → storeId map for orders that pre-date the storeId field
  const pincodeToStoreId = useMemo(() => {
    const map: Record<string, string> = {};
    stores.forEach(s => s.serviceablePincodes?.forEach(pin => { map[pin] = s.id; }));
    return map;
  }, [stores]);

  // Resolve store for an order: storeId field first, fall back to pincode lookup
  const resolveStoreId = (order: Order) =>
    order.storeId || pincodeToStoreId[order.deliveryAddress?.pincode || ""] || null;

  const STATUS_LABELS: Record<OrderStatus, string> = {
    confirmed: "Confirmed",
    packed: "Packed",
    dispatched: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
  };

  const updateStatus = async (order: Order, nextStatus: OrderStatus, updatedBy = "admin") => {
    // Guard: an order cannot be dispatched without an assigned agent
    if (nextStatus === "dispatched" && !order.agentId) {
      toast.error("Please assign a delivery agent before dispatching this order.");
      return;
    }

    setUpdating(order.id);
    try {
      await updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), {
        status: nextStatus,
        statusHistory: arrayUnion({ status: nextStatus, timestamp: new Date().toISOString(), updatedBy }),
        updatedAt: serverTimestamp(),
      });
      toast.success(`Order updated to "${STATUS_LABELS[nextStatus]}"`);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to update order status. Please try again."));
    }
    setUpdating(null);
  };

  const assignAgent = async (orderId: string, agentId: string) => {
    setAssigningOrder(orderId);
    try {
      await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
        agentId: agentId || null,
        updatedAt: serverTimestamp(),
      });
      // Mark agent busy — don't track a single activeOrderId since agents carry multiple orders
      if (agentId) {
        await updateDoc(doc(db, COLLECTIONS.AGENTS, agentId), { status: "busy" });
      }
      toast.success("Agent assigned");
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to assign agent. Please try again."));
    }
    setAssigningOrder(null);
  };

  // Apply store filter first, then status filter
  const storeFiltered = storeFilter === "all"
    ? orders
    : orders.filter(o => resolveStoreId(o) === storeFilter);

  const filtered = statusFilter === "all"
    ? storeFiltered
    : storeFiltered.filter(o => o.status === statusFilter);

  const counts = storeFiltered.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Orders per agent across ALL active (non-delivered/cancelled) orders
  const ordersByAgent = orders.reduce((acc, o) => {
    if (o.agentId && o.status !== "delivered" && o.status !== "cancelled" && o.status !== "refunded") {
      acc[o.agentId] = (acc[o.agentId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-black">Order Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            {format(new Date(selectedDate + "T00:00:00"), "dd MMM yyyy")} · {orders.length} orders · live
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date picker with quick-jump buttons */}
          <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-xl px-1 py-1">
            <button
              onClick={() => setSelectedDate(format(subDays(new Date(selectedDate + "T00:00:00"), 1), "yyyy-MM-dd"))}
              className="px-2 py-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 text-sm font-bold"
            >‹</button>
            <input
              type="date"
              value={selectedDate}
              onChange={e => e.target.value && setSelectedDate(e.target.value)}
              className="bg-transparent text-gray-300 text-sm focus:outline-none px-1"
            />
            <button
              onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
              className="px-2 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
            >Today</button>
            <button
              onClick={() => {
                const next = new Date(selectedDate + "T00:00:00");
                next.setDate(next.getDate() + 1);
                if (next <= new Date()) setSelectedDate(format(next, "yyyy-MM-dd"));
              }}
              className="px-2 py-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 text-sm font-bold"
            >›</button>
          </div>

          {/* Store selector */}
          <div className="flex items-center gap-2">
            <StoreIcon size={14} className="text-gray-500" />
            <select
              value={storeFilter}
              onChange={e => setStoreFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Stores ({orders.length})</option>
              {stores.map(s => {
                const count = orders.filter(o => resolveStoreId(o) === s.id).length;
                return <option key={s.id} value={s.id}>{s.name} ({count})</option>;
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap mb-5">
        <button onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${statusFilter === "all" ? "bg-white text-black" : "bg-gray-800 text-gray-400"}`}>
          All ({storeFiltered.length})
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
              {["Order ID", "Store", "Customer", "Items", "Total", "Payment", "Slot", "Status", "Agent", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((order, i) => (
              <tr key={order.id} className={`border-b border-gray-800/50 hover:bg-gray-800/20 ${i % 2 === 0 ? "" : "bg-gray-900/50"}`}>
                <td className="px-4 py-3">
                  <span className="text-emerald-400 text-xs font-mono">#{order.id.slice(-6).toUpperCase()}</span>
                  <div className="text-gray-600 text-xs">{fmtDate(order.createdAt, "dd MMM, hh:mm a")}</div>
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const sid = resolveStoreId(order);
                    const store = stores.find(s => s.id === sid);
                    return store
                      ? <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-lg whitespace-nowrap">{store.code}</span>
                      : <span className="text-xs text-gray-600">—</span>;
                  })()}
                  <div className="text-gray-600 text-xs mt-0.5">{order.deliveryAddress?.pincode}</div>
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
                  <select
                    value={order.agentId || ""}
                    onChange={e => assignAgent(order.id, e.target.value)}
                    disabled={assigningOrder === order.id}
                    className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500 max-w-[140px]"
                  >
                    <option value="">— Unassigned —</option>
                    {agents.map(a => {
                      const load = ordersByAgent[a.id] || 0;
                      const status = a.status === "offline" ? " (offline)" : load > 0 ? ` (${load} orders)` : "";
                      return <option key={a.id} value={a.id}>{a.name}{status}</option>;
                    })}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setSelectedOrder(order)}
                      className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg"><Eye size={14} /></button>
                    {/* Next status button */}
                    {STATUS_FLOW.indexOf(order.status) >= 0 && STATUS_FLOW.indexOf(order.status) < STATUS_FLOW.length - 1 && (
                      <button
                        onClick={() => updateStatus(order, STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1])}
                        disabled={updating === order.id}
                        className="flex items-center gap-1 px-2 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg hover:bg-emerald-500/30 disabled:opacity-50"
                        title={STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1] === "dispatched" && !order.agentId ? "Assign an agent first" : ""}
                      >
                        <Truck size={12} />
                        {STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1]}
                      </button>
                    )}
                    {(order.status === "confirmed" || order.status === "packed") && (
                      <button onClick={() => updateStatus(order, "cancelled")}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg" title="Cancel order"><X size={14} /></button>
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

      {/* Agent Load Summary */}
      {agents.length > 0 && (
        <div className="mt-6">
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">Agent Load</h2>
          <div className="grid grid-cols-4 gap-3">
            {agents.map(agent => {
              const load = ordersByAgent[agent.id] || 0;
              const statusColor = agent.status === "available" ? "text-emerald-400" : agent.status === "busy" ? "text-blue-400" : "text-gray-500";
              const dotColor = agent.status === "available" ? "bg-emerald-500" : agent.status === "busy" ? "bg-blue-500" : "bg-gray-600";
              return (
                <div key={agent.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-bold truncate">{agent.name}</div>
                    <div className={`text-xs ${statusColor}`}>{load} active order{load !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="text-2xl font-black text-gray-600">{load}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                      <span className="text-gray-600 text-xs">{fmtDate(h.timestamp, "dd MMM, hh:mm a", "")}</span>
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

              {/* Store */}
              {(() => {
                const sid = resolveStoreId(selectedOrder);
                const store = stores.find(s => s.id === sid);
                return store ? (
                  <div>
                    <div className="text-gray-500 text-xs font-bold uppercase mb-2">Serving Store</div>
                    <div className="text-blue-400 text-sm font-semibold">{store.name} <span className="text-gray-600 font-mono text-xs">({store.code})</span></div>
                    <div className="text-gray-500 text-xs">{store.address.line1}, {store.address.city}</div>
                  </div>
                ) : null;
              })()}

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
