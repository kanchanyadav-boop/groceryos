// admin/src/pages/Dashboard.tsx
import { useState, useEffect } from "react";
import {
  collection, query, orderBy, limit, onSnapshot,
  where, getDocs, Timestamp
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Order, Agent } from "../../shared/types";
import { COLLECTIONS } from "../../shared/config";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  ShoppingCart, Package, TrendingUp, Users, Truck,
  AlertTriangle, Clock, CheckCircle
} from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

// Defined at module level — not recreated on every Dashboard render
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  confirmed:  { label: "Confirmed",  color: "text-blue-400",    bg: "bg-blue-500/10 border border-blue-500/20" },
  packed:     { label: "Packed",     color: "text-yellow-400",  bg: "bg-yellow-500/10 border border-yellow-500/20" },
  dispatched: { label: "Dispatched", color: "text-purple-400",  bg: "bg-purple-500/10 border border-purple-500/20" },
  delivered:  { label: "Delivered",  color: "text-emerald-400", bg: "bg-emerald-500/10 border border-emerald-500/20" },
  cancelled:  { label: "Cancelled",  color: "text-red-400",     bg: "bg-red-500/10 border border-red-500/20" },
  refunded:   { label: "Refunded",   color: "text-gray-400",    bg: "bg-gray-500/10 border border-gray-500/20" },
};

function StatCard({ label, value, sub, icon: Icon, color, bg }: StatCardProps) {
  return (
    <div className={`${bg} border rounded-2xl p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">{label}</p>
          <p className={`text-3xl font-black mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-gray-600 text-xs mt-1">{sub}</p>}
        </div>
        <div className={`${bg} border rounded-xl p-2.5`}>
          <Icon size={20} className={color} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [chartData, setChartData] = useState<{ day: string; revenue: number; orders: number }[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Real-time today's orders
  useEffect(() => {
    const from = Timestamp.fromDate(startOfDay(new Date()));
    const to = Timestamp.fromDate(endOfDay(new Date()));
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where("createdAt", ">=", from),
      where("createdAt", "<=", to),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, snap => {
      setTodayOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });
  }, []);

  // Real-time recent orders feed
  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      orderBy("createdAt", "desc"),
      limit(8)
    );
    return onSnapshot(q, snap => {
      setRecentOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      setLoading(false);
    });
  }, []);

  // Real-time agents
  useEffect(() => {
    return onSnapshot(collection(db, COLLECTIONS.AGENTS), snap => {
      setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Agent)));
    });
  }, []);

  // 7-day chart data
  useEffect(() => {
    const load = async () => {
      const from = Timestamp.fromDate(startOfDay(subDays(new Date(), 6)));
      const snap = await getDocs(query(
        collection(db, COLLECTIONS.ORDERS),
        where("createdAt", ">=", from),
        orderBy("createdAt", "asc")
      ));
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));

      const days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        const label = format(d, "dd MMM");
        const dayStart = startOfDay(d).getTime();
        const dayEnd = endOfDay(d).getTime();
        const dayOrders = orders.filter(o => {
          const t = o.createdAt ? new Date(o.createdAt).getTime() : 0;
          return t >= dayStart && t <= dayEnd;
        });
        return {
          day: label,
          revenue: dayOrders.reduce((a, o) => a + (o.totalAmount || 0), 0),
          orders: dayOrders.length,
        };
      });
      setChartData(days);
    };
    load();
  }, []);

  // Low stock count — query only items where available === 0 for the count badge.
  // Full low-stock analysis (available <= threshold) requires client-side filtering
  // since threshold varies per item; a Cloud Function should maintain an isLowStock flag
  // for a scalable server-side query. For now, limit the scan to 500 items.
  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.INVENTORY), limit(500))
      );
      const count = snap.docs.filter(d => {
        const inv = d.data();
        return inv.available <= inv.lowStockThreshold;
      }).length;
      setLowStockCount(count);
    };
    load();
  }, []);

  // Computed stats
  const todayRevenue = todayOrders
    .filter(o => o.status !== "cancelled" && o.status !== "refunded")
    .reduce((a, o) => a + (o.totalAmount || 0), 0);

  const pendingOrders = todayOrders.filter(o =>
    o.status === "confirmed" || o.status === "packed"
  ).length;

  const activeDeliveries = todayOrders.filter(o => o.status === "dispatched").length;
  const availableAgents = agents.filter(a => a.status === "available").length;
  const busyAgents = agents.filter(a => a.status === "busy").length;

  return (
    <div className="p-6 max-w-[1200px]">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-white text-2xl font-black">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), "EEEE, dd MMMM yyyy")} · Live dashboard
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Today's Revenue"
          value={`₹${todayRevenue.toLocaleString()}`}
          sub={`${todayOrders.length} orders placed`}
          icon={TrendingUp}
          color="text-emerald-400"
          bg="bg-emerald-500/10 border-emerald-500/20"
        />
        <StatCard
          label="Pending Orders"
          value={pendingOrders}
          sub="Need attention"
          icon={Clock}
          color="text-yellow-400"
          bg="bg-yellow-500/10 border-yellow-500/20"
        />
        <StatCard
          label="Active Deliveries"
          value={activeDeliveries}
          sub={`${busyAgents} agents on road`}
          icon={Truck}
          color="text-blue-400"
          bg="bg-blue-500/10 border-blue-500/20"
        />
        <StatCard
          label="Low Stock Items"
          value={lowStockCount}
          sub="Items need restocking"
          icon={AlertTriangle}
          color="text-red-400"
          bg="bg-red-500/10 border-red-500/20"
        />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-bold text-sm">Revenue — Last 7 Days</h3>
            <div className="text-gray-500 text-xs">
              Total: ₹{chartData.reduce((a, d) => a + d.revenue, 0).toLocaleString()}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, color: "#fff", fontSize: 12 }}
                formatter={(val) => [`₹${val}`, "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Agent Status */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4">Delivery Agents</h3>
          <div className="space-y-3 mb-5">
            {[
              { label: "Available", count: availableAgents, color: "bg-emerald-500" },
              { label: "On Delivery", count: busyAgents, color: "bg-blue-500" },
              { label: "Offline", count: agents.filter(a => a.status === "offline").length, color: "bg-gray-600" },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span className="text-gray-400 text-sm">{s.label}</span>
                </div>
                <span className="text-white font-bold text-sm">{s.count}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 pt-4 space-y-3">
            {agents.slice(0, 4).map(agent => (
              <div key={agent.id} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  agent.status === "available" ? "bg-emerald-500" :
                  agent.status === "busy" ? "bg-blue-500" : "bg-gray-600"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-semibold truncate">{agent.name}</div>
                  <div className="text-gray-600 text-xs">{agent.vehicleNumber}</div>
                </div>
                <div className="text-gray-500 text-xs">⭐{agent.rating?.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-bold text-sm">Live Order Feed</h3>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-gray-500 text-xs">Real-time</span>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800/60">
              {["Order", "Customer", "Items", "Total", "Payment", "Slot", "Status"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order, i) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.confirmed;
              return (
                <tr key={order.id} className={`border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors ${i % 2 ? "bg-gray-900/40" : ""}`}>
                  <td className="px-4 py-3">
                    <span className="text-emerald-400 text-xs font-mono font-bold">
                      #{order.id?.slice(-6).toUpperCase()}
                    </span>
                    <div className="text-gray-600 text-xs mt-0.5">
                      {order.createdAt ? format(new Date(order.createdAt), "hh:mm a") : "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">
                    {order.deliveryAddress?.city || "Customer"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{order.items?.length || 0}</td>
                  <td className="px-4 py-3 text-white font-bold text-sm">₹{order.totalAmount}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs uppercase font-semibold">{order.paymentMethod}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{order.deliverySlot?.slot || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${cfg.bg} ${cfg.color}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && <div className="py-8 text-center text-gray-600 text-sm">Loading...</div>}
      </div>
    </div>
  );
}
