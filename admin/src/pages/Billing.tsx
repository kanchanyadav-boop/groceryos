// admin/src/pages/Billing.tsx
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Payment, Order } from "../../shared/types";
import { COLLECTIONS, APP_CONFIG } from "../../shared/config";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
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
      case "week":  return { from: startOfWeek(now), to: endOfWeek(now) };
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
  const captured = payments.filter(p => p.status === "captured");
  const totalRevenue = captured.reduce((a, p) => a + p.amount, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const methodBreakdown = payments.reduce((acc, p) => {
    acc[p.method] = (acc[p.method] || 0) + (p.status === "captured" ? p.amount : 0);
    return acc;
  }, {} as Record<string, number>);

  // ── Daily chart data ───────────────────────────────────────────────────────
  const dailyData = orders.reduce((acc, o) => {
    const day = o.createdAt ? format(new Date(o.createdAt), "dd MMM") : "—";
    const existing = acc.find(d => d.day === day);
    if (existing) { existing.revenue += o.totalAmount; existing.orders += 1; }
    else acc.push({ day, revenue: o.totalAmount, orders: 1 });
    return acc;
  }, [] as { day: string; revenue: number; orders: number }[]);

  // ── PDF Invoice Generator ──────────────────────────────────────────────────
  const generateReport = () => {
    const pdf = new jsPDF();
    const { from, to } = getRange();

    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("GroceryOS — Sales Report", 14, 20);

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

    // Transactions
    pdf.text("Transaction Details", 14, (pdf as any).lastAutoTable.finalY + 14);
    autoTable(pdf, {
      startY: (pdf as any).lastAutoTable.finalY + 18,
      head: [["Payment ID", "Order ID", "Amount", "Method", "Status", "Date"]],
      body: payments.slice(0, 50).map(p => [
        p.id.slice(-8).toUpperCase(),
        p.orderId?.slice(-6).toUpperCase() || "—",
        `₹${p.amount}`,
        p.method.toUpperCase(),
        p.status,
        p.createdAt ? format(new Date(p.createdAt), "dd/MM/yy") : "—",
      ]),
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
    });

    pdf.save(`GroceryOS_Report_${range}_${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success("PDF report downloaded");
  };

  const exportCSV = () => {
    const data = payments.map(p => ({
      "Payment ID": p.id, "Order ID": p.orderId, "Amount": p.amount,
      "Method": p.method, "Status": p.status,
      "Date": p.createdAt ? format(new Date(p.createdAt), "dd/MM/yyyy") : "",
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
        {(["today", "week", "month"] as DateRange[]).map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${range === r ? "bg-emerald-500 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
            {r === "today" ? "Today" : r === "week" ? "This Week" : "This Month"}
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
              {["Payment ID", "Order ID", "Amount", "Method", "Status", "Date"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <tr key={p.id} className={`border-b border-gray-800/50 ${i % 2 === 0 ? "" : "bg-gray-900/50"}`}>
                <td className="px-4 py-3 text-emerald-400 text-xs font-mono">{p.id.slice(-10).toUpperCase()}</td>
                <td className="px-4 py-3 text-gray-400 text-xs font-mono">#{p.orderId?.slice(-6).toUpperCase()}</td>
                <td className="px-4 py-3 text-white font-bold text-sm">₹{p.amount}</td>
                <td className="px-4 py-3 text-gray-400 text-sm uppercase">{p.method}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.status === "captured" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {p.createdAt ? format(new Date(p.createdAt), "dd MMM, hh:mm a") : "—"}
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
