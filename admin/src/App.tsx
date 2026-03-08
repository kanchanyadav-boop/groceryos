// admin/src/App.tsx
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SKUManagement from "./pages/SKUManagement";
import Inventory from "./pages/Inventory";
import OrderManagement from "./pages/OrderManagement";
import CreateOrder from "./pages/CreateOrder";
import RefundManagement from "./pages/RefundManagement";
import Billing from "./pages/Billing";
import StoreManagement from "./pages/StoreManagement";
import DeliverySlots from "./pages/DeliverySlots";
import TeamManagement from "./pages/TeamManagement";
import PurchaseOrders from "./pages/PurchaseOrders";
import {
  Tag, Package, ShoppingCart, RotateCcw, IndianRupee,
  LayoutDashboard, LogOut, Plus, Store, Clock, Users,
  Truck
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, module: "orders" },
  { to: "/orders", label: "Orders", icon: ShoppingCart, module: "orders" },
  { to: "/create-order", label: "Create Order", icon: Plus, module: "orders" },
  { to: "/stores", label: "Stores", icon: Store, module: "orders" },
  { to: "/delivery-slots", label: "Delivery Slots", icon: Clock, module: "orders" },
  { to: "/sku", label: "Products", icon: Tag, module: "sku" },
  { to: "/inventory", label: "Inventory", icon: Package, module: "inventory" },
  { to: "/purchase-orders", label: "Purchase Orders", icon: Truck, module: "inventory" },
  { to: "/refunds", label: "Refunds", icon: RotateCcw, module: "refunds" },
  { to: "/billing", label: "Billing", icon: IndianRupee, module: "billing" },
  { to: "/team", label: "Team", icon: Users, module: "staff" },
];

function Sidebar() {
  const { staffProfile, role, logout, hasPermission } = useAuth();

  return (
    <aside className="w-56 bg-gray-950 border-r border-gray-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center text-base">🛒</div>
          <div>
            <div className="text-white font-black text-sm">Green's Supermarket</div>
            <div className="text-gray-600 text-xs capitalize">{role}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.filter(n => hasPermission(n.module)).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
              }`
            }
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="mb-3">
          <div className="text-white text-sm font-semibold">{staffProfile?.name}</div>
          <div className="text-gray-600 text-xs">{staffProfile?.email}</div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-gray-500 hover:text-red-400 text-sm font-medium transition-colors w-full"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-emerald-400 text-sm animate-pulse">Loading...</div>
    </div>
  );

  if (!user) return <Login />;

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<OrderManagement />} />
          <Route path="/create-order" element={<CreateOrder />} />
          <Route path="/stores" element={<StoreManagement />} />
          <Route path="/delivery-slots" element={<DeliverySlots />} />
          <Route path="/sku" element={<SKUManagement />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/refunds" element={<RefundManagement />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/team" element={<TeamManagement />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#111827", border: "1px solid #1f2937", color: "#fff", fontSize: 13 },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
