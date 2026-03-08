// admin/src/pages/Billing.tsx
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Payment, Order } from "../../shared/types";
import { COLLECTIONS, APP_CONFIG } from "../../shared/config";
import {
  format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth
} from "date-fns";
import { toDate, fmtDate } from "../lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import toast from "react-hot-toast";
import { Download, FileText, TrendingUp, ShoppingBag, CreditCard } from "lucide-react";

type DateRange = "today" | "week" | "month";

export default function Billing() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [range, setRange] = useState<DateRange>("week");
  const [loading, setLoading] = useState(true);

  const getRange = () => {
    const now = new Date();
    switch (range) {
      case "today": return { from: startOfDay(now), to: endOfDay(now) };
      case "week": return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) }; // Last 7 Days (including today)
      case "month": return { from: startOfMonth(now), to: endOfMonth(now) };
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { from, to } = getRange();
      try {
        const [pSnap, oSnap] = await Promise.all([
          getDocs(query(
            collection(db, COLLECTIONS.PAYMENTS),
            where("createdAt", ">=", Timestamp.fromDate(from)),
            where("createdAt", "<=", Timestamp.fromDate(to)),
            orderBy("createdAt", "desc")
          )),
          getDocs(query(
            collection(db, COLLECTIONS.ORDERS),
            where("createdAt", ">=", Timestamp.fromDate(from)),
            where("createdAt", "<=", Timestamp.fromDate(to)),
            orderBy("createdAt", "desc")
          )),
        ]);
        setPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
        setOrders(oSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      } catch (err) {
        toast.error("Failed to load billing data");
      }
      setLoading(false);
    };
    load();
  }, [range]);

  // ── Computed stats ─────────────────────────────────────────────────────────
  // Revenue = online captured payments + COD orders (which never create Payment docs).
  // We derive all revenue from the orders collection to avoid double-counting.
  const completedOrders = orders.filter(o => o.status !== "cancelled" && o.status !== "refunded");
  const totalRevenue = completedOrders.reduce((a, o) => a + (o.totalAmount || 0), 0);
  const totalOrders = orders.length;
  const avgOrderValue = completedOrders.length > 0
    ? Math.round(totalRevenue / completedOrders.length)
    : 0;

  // Payment method breakdown — COD from orders, others from captured payments
  const methodBreakdown = completedOrders.reduce((acc, o) => {
    const method = o.paymentMethod || "cod";
    acc[method] = (acc[method] || 0) + (o.totalAmount || 0);
    return acc;
  }, {} as Record<string, number>);

  // ── Daily chart data (O(n) via Map, not O(n²) find-in-array) ──────────────
  const dailyData = Object.values(
    orders.reduce((acc, o) => {
      const day = fmtDate(o.createdAt, "dd MMM");
      if (!acc[day]) acc[day] = { day, revenue: 0, orders: 0 };
      acc[day].revenue += o.totalAmount;
      acc[day].orders += 1;
      return acc;
    }, {} as Record<string, { day: string; revenue: number; orders: number }>)
  );

  // ── PDF Invoice Generator ──────────────────────────────────────────────────
  const generateReport = () => {
    const pdf = new jsPDF();
    const { from, to } = getRange();

    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("Green's Supermarket — Sales Report", 14, 20);

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100);
    pdf.text(`Period: ${format(from, "dd MMM yyyy")} – ${format(to, "dd MMM yyyy")}`, 14, 28);
    pdf.text(`Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, 14, 34);

    // Summary
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0);
    pdf.text("Summary", 14, 46);

    autoTable(pdf, {
      startY: 50,
      head: [["Metric", "Value"]],
      body: [
        ["Total Revenue", `₹${totalRevenue.toLocaleString()}`],
        ["Total Orders", totalOrders.toString()],
        ["Avg. Order Value", `₹${avgOrderValue}`],
        ["UPI Payments", `₹${(methodBreakdown.upi || 0).toLocaleString()}`],
        ["Card Payments", `₹${(methodBreakdown.card || 0).toLocaleString()}`],
        ["COD", `₹${(methodBreakdown.cod || 0).toLocaleString()}`],
      ],
      headStyles: { fillColor: [16, 185, 129] },
    });

    // Transactions - List Orders instead of Payments to include COD
    pdf.text("Recent Orders / Transactions", 14, (pdf as any).lastAutoTable.finalY + 14);
    autoTable(pdf, {
      startY: (pdf as any).lastAutoTable.finalY + 18,
      head: [["Order ID", "Payment ID", "Amount", "Method", "Status", "Date"]],
      body: orders.slice(0, 100).map(o => [
        o.id.slice(-8).toUpperCase(),
        o.paymentId?.slice(-8).toUpperCase() || "COD",
        `₹${o.totalAmount}`,
        o.paymentMethod.toUpperCase(),
        o.status.toUpperCase(),
        fmtDate(o.createdAt, "dd/MM/yy"),
      ]),
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
    });

    pdf.save(`Greens_Supermarket_Report_${range}_${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success("PDF report downloaded");
  };

  const exportCSV = () => {
    const data = orders.map(o => ({
      "Order ID": o.id, "Payment ID": o.paymentId || "COD", "Amount": o.totalAmount,
      "Method": o.paymentMethod, "Status": o.status,
      "Date": fmtDate(o.createdAt, "dd/MM/yyyy", ""),
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `transactions_${range}_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-black">Billing & Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Revenue analytics · Transaction history · GST exports</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-700">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={generateReport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500">
            <FileText size={14} /> PDF Report
          </button>
        </div>
      </div>

      {/* Range selector */}
      <div className="flex gap-2 mb-6">
        {(["today", "week", "month"] as const).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${range === r ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            {r === "today" ? "Today" : r === "week" ? "Last 7 Days" : "This Month"}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Total Orders", value: totalOrders, icon: ShoppingBag, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Avg. Order Value", value: `₹${avgOrderValue}`, icon: CreditCard, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} border rounded-2xl p-5`}>
            <div className="flex items-center gap-3">
              <stat.icon size={22} className={stat.color} />
              <div>
                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-gray-500 text-xs mt-0.5">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <h3 className="text-white font-bold text-sm mb-4">Daily Revenue</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyData}>
            <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, color: "#fff" }}
              formatter={(val) => [`₹${val}`, "Revenue"]}
            />
            <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Payment method breakdown */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Object.entries(methodBreakdown).map(([method, amount]) => (
          <div key={method} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-500 text-xs uppercase font-bold mb-1">{method}</div>
            <div className="text-white font-black text-lg">₹{amount.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-bold text-sm">Recent Transactions</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              {["Order ID", "Payment ID", "Amount", "Method", "Status", "Date"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o, i) => (
              <tr key={o.id} className={`border-b border-gray-800/50 ${i % 2 === 0 ? "" : "bg-gray-900/50"}`}>
                <td className="px-4 py-3 text-emerald-400 text-xs font-mono">#{o.id.slice(-8).toUpperCase()}</td>
                <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                  {o.paymentId ? o.paymentId.slice(-10).toUpperCase() : <span className="text-gray-600">COD</span>}
                </td>
                <td className="px-4 py-3 text-white font-bold text-sm">₹{o.totalAmount}</td>
                <td className="px-4 py-3 text-gray-400 text-sm uppercase">{o.paymentMethod}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${["delivered", "dispatched"].includes(o.status) ? "bg-emerald-500/15 text-emerald-400" : o.status === "cancelled" ? "bg-red-500/15 text-red-400" : "bg-blue-500/15 text-blue-400"}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {fmtDate(o.createdAt, "dd MMM, hh:mm a")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="py-8 text-center text-gray-600 text-sm">Loading transactions...</div>}
      </div>
    </div>
  );
}
