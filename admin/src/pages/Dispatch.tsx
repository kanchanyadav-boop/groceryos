// admin/src/pages/Dispatch.tsx
import { useState, useEffect } from "react";
import {
  collection, query, where, onSnapshot, doc, updateDoc,
  serverTimestamp, orderBy, limit
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Order, Agent } from "../../shared/types";
import { COLLECTIONS } from "../../shared/config";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toDate } from "../lib/utils";
import app from "../lib/firebase";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  MapPin, Zap, Navigation, Phone, Star, Package, X, CheckCircle
} from "lucide-react";
import { friendlyError } from "../lib/errors";

// Initialized once at module level — not recreated on every function call
const functions = getFunctions(app);

const AGENT_STATUS_STYLES: Record<string, { label: string; color: string; dot: string }> = {
  available: { label: "Available", color: "text-emerald-400", dot: "bg-emerald-500" },
  busy:      { label: "On Delivery", color: "text-blue-400",   dot: "bg-blue-500" },
  offline:   { label: "Offline",     color: "text-gray-500",   dot: "bg-gray-600" },
};

export default function Dispatch() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [autoAssigning, setAutoAssigning] = useState<string | null>(null);

  // Real-time pending orders (confirmed + packed, no agent)
  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where("status", "in", ["confirmed", "packed"]),
      orderBy("createdAt", "asc"),
      limit(30)
    );
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      setPendingOrders(all.filter(o => !o.agentId));
    });
  }, []);

  // Active dispatched orders
  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where("status", "==", "dispatched"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    return onSnapshot(q, snap => {
      setActiveOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });
  }, []);

  // Real-time agents
  useEffect(() => {
    return onSnapshot(collection(db, COLLECTIONS.AGENTS), snap => {
      setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Agent)));
    });
  }, []);

  const manualAssign = async (orderId: string, agentId: string) => {
    setAssigning(orderId);
    try {
      await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
        agentId, updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, COLLECTIONS.AGENTS, agentId), {
        status: "busy", activeOrderId: orderId,
      });
      toast.success("Delivery agent assigned successfully");
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to assign agent. Please try again."));
    }
    setAssigning(null);
  };

  const autoAssign = async (orderId: string) => {
    setAutoAssigning(orderId);
    try {
      const fn = httpsCallable(functions, "autoAssignAgent");
      const result = await fn({ orderId }) as any;
      toast.success(`Auto-assigned to ${result.data.agentName}`);
    } catch (err: any) {
      toast.error(friendlyError(err, "No available agents nearby. Try assigning manually."));
    }
    setAutoAssigning(null);
  };

  const availableAgents = agents.filter(a => a.status === "available");
  const busyAgents = agents.filter(a => a.status === "busy");

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-black">Delivery Dispatch</h1>
        <p className="text-gray-500 text-sm mt-1">
          Assign orders to agents · Monitor active deliveries
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Unassigned", value: pendingOrders.length, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
          { label: "Active Deliveries", value: activeOrders.length, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Available Agents", value: availableAgents.length, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Busy Agents", value: busyAgents.length, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-2xl p-5`}>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ── Unassigned Orders ── */}
        <div>
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">
            Unassigned Orders ({pendingOrders.length})
          </h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {pendingOrders.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
                <CheckCircle size={28} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">All orders are assigned!</p>
              </div>
            ) : (
              pendingOrders.map(order => (
                <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-emerald-400 text-xs font-mono font-bold">
                        #{order.id.slice(-6).toUpperCase()}
                      </span>
                      <div className="text-gray-600 text-xs mt-0.5">
                        {order.createdAt ? format(toDate(order.createdAt)!, "hh:mm a") : "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-black">₹{order.totalAmount}</div>
                      <div className="text-gray-500 text-xs">{order.items?.length} items</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 mb-3 bg-gray-800/60 rounded-xl p-3">
                    <MapPin size={13} className="text-gray-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-gray-300 text-xs font-medium">{order.deliveryAddress?.line1}</div>
                      <div className="text-gray-500 text-xs">{order.deliveryAddress?.city} · Slot: {order.deliverySlot?.slot}</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <select
                      onChange={e => e.target.value && manualAssign(order.id, e.target.value)}
                      disabled={assigning === order.id}
                      className="flex-1 bg-gray-800 border border-gray-700 text-gray-400 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Assign agent manually...</option>
                      {availableAgents.map(a => (
                        <option key={a.id} value={a.id}>{a.name} · ⭐{a.rating?.toFixed(1)}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => autoAssign(order.id)}
                      disabled={autoAssigning === order.id || availableAgents.length === 0}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl hover:bg-emerald-500/30 disabled:opacity-40 transition-colors border border-emerald-500/30"
                    >
                      <Zap size={12} /> Auto
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Active Deliveries ── */}
        <div>
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">
            Active Deliveries ({activeOrders.length})
          </h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {activeOrders.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
                <p className="text-gray-500 text-sm">No active deliveries right now</p>
              </div>
            ) : (
              activeOrders.map(order => {
                const agent = agents.find(a => a.id === order.agentId);
                return (
                  <div key={order.id} className="bg-gray-900 border border-blue-500/20 rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-blue-400 text-xs font-mono font-bold">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                        <div className="text-gray-600 text-xs mt-0.5">Dispatched</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-black">₹{order.totalAmount}</div>
                        <div className={`text-xs font-semibold ${order.paymentMethod === "cod" ? "text-yellow-400" : "text-emerald-400"}`}>
                          {order.paymentMethod === "cod" ? "💵 COD" : "✅ Paid"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 mb-3 bg-gray-800/60 rounded-xl p-3">
                      <MapPin size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-gray-300 text-xs font-medium">{order.deliveryAddress?.line1}</div>
                        <div className="text-gray-500 text-xs">{order.deliveryAddress?.city}</div>
                      </div>
                    </div>

                    {agent && (
                      <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-sm">🛵</div>
                        <div className="flex-1">
                          <div className="text-white text-xs font-bold">{agent.name}</div>
                          <div className="text-gray-500 text-xs">{agent.vehicleNumber}</div>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-400 text-xs">
                          <Star size={10} fill="currentColor" />
                          {agent.rating?.toFixed(1)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Agent Board */}
      <div className="mt-6">
        <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">Agent Status Board</h2>
        <div className="grid grid-cols-4 gap-3">
          {agents.map(agent => {
            const s = AGENT_STATUS_STYLES[agent.status] || AGENT_STATUS_STYLES.offline;
            return (
              <div key={agent.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className={`text-xs font-semibold ${s.color}`}>{s.label}</span>
                </div>
                <div className="text-white text-sm font-bold mb-0.5">{agent.name}</div>
                <div className="text-gray-600 text-xs font-mono mb-2">{agent.vehicleNumber}</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-yellow-400 text-xs">
                    <Star size={10} fill="currentColor" />
                    {agent.rating?.toFixed(1) || "—"}
                  </div>
                  <div className="text-gray-600 text-xs">{agent.totalDeliveries} deliveries</div>
                </div>
                {agent.status === "busy" && agent.activeOrderId && (
                  <div className="mt-2 bg-blue-500/10 rounded-lg px-2 py-1">
                    <span className="text-blue-400 text-xs font-mono">
                      #{agent.activeOrderId.slice(-6).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
