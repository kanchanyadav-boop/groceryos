// admin/src/pages/TeamManagement.tsx
import { useState, useEffect } from "react";
import {
  collection, query, getDocs, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import toast from "react-hot-toast";
import { COLLECTIONS } from "../../../shared/config";
import { StaffMember, Agent, Store, UserRole } from "../../../shared/types";
import { friendlyError } from "../lib/errors";
import {
  Users, Bike, Plus, X, Edit2, Trash2, ShieldCheck,
  Eye, EyeOff, RefreshCw,
} from "lucide-react";

type Tab = "staff" | "agents";

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "admin",             label: "Admin",             description: "Full access to all modules" },
  { value: "inventory_manager", label: "Inventory Manager", description: "Products & inventory management" },
  { value: "dispatcher",        label: "Dispatcher",        description: "Orders & delivery dispatch" },
  { value: "billing",           label: "Billing",           description: "Payments, refunds & reports" },
  { value: "support",           label: "Support",           description: "View orders only" },
];

const ROLE_BADGE: Record<UserRole, string> = {
  admin:             "bg-purple-500/15 text-purple-400 border-purple-500/30",
  inventory_manager: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  dispatcher:        "bg-orange-500/15 text-orange-400 border-orange-500/30",
  billing:           "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  support:           "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

const AGENT_STATUS_BADGE: Record<string, string> = {
  available: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  busy:      "bg-orange-500/15 text-orange-400 border-orange-500/30",
  offline:   "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

export default function TeamManagement() {
  const [tab, setTab] = useState<Tab>("staff");

  // ── Staff state ──────────────────────────────────────────────────────────────
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: "", email: "", password: "", role: "support" as UserRole });
  const [showPassword, setShowPassword] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [editingRole, setEditingRole] = useState<{ id: string; role: UserRole } | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  // ── Agent state ──────────────────────────────────────────────────────────────
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [agentForm, setAgentForm] = useState({
    name: "", phone: "", vehicleNumber: "", storeId: "",
  });
  const [savingAgent, setSavingAgent] = useState(false);

  useEffect(() => { loadStaff(); loadAgents(); loadStores(); }, []);

  const loadStaff = async () => {
    setStaffLoading(true);
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.STAFF));
      setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember)));
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to load staff list."));
    }
    setStaffLoading(false);
  };

  const loadAgents = async () => {
    setAgentsLoading(true);
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.AGENTS));
      setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Agent)));
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to load agents list."));
    }
    setAgentsLoading(false);
  };

  const loadStores = async () => {
    const snap = await getDocs(query(collection(db, COLLECTIONS.STORES), where("isActive", "==", true)));
    setStores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Store)));
  };

  // ── Staff: create ─────────────────────────────────────────────────────────────
  const createStaff = async () => {
    if (!staffForm.name.trim() || !staffForm.email.trim() || !staffForm.password || !staffForm.role) {
      toast.error("All fields are required");
      return;
    }
    if (staffForm.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setCreatingStaff(true);
    try {
      const createStaffUser = httpsCallable(functions, "createStaffUser");
      await createStaffUser({
        name: staffForm.name.trim(),
        email: staffForm.email.trim(),
        password: staffForm.password,
        role: staffForm.role,
      });
      toast.success(`${staffForm.name} added as ${staffForm.role.replace("_", " ")}`);
      setStaffForm({ name: "", email: "", password: "", role: "support" });
      setShowStaffForm(false);
      await loadStaff();
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to create staff account."));
    }
    setCreatingStaff(false);
  };

  // ── Staff: change role ────────────────────────────────────────────────────────
  const updateStaffRole = async () => {
    if (!editingRole) return;
    setSavingRole(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.STAFF, editingRole.id), {
        role: editingRole.role,
        updatedAt: serverTimestamp(),
      });
      setStaff(prev => prev.map(s => s.id === editingRole.id ? { ...s, role: editingRole.role } : s));
      toast.success("Role updated");
      setEditingRole(null);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to update role."));
    }
    setSavingRole(false);
  };

  // ── Staff: delete ─────────────────────────────────────────────────────────────
  const deleteStaff = async (member: StaffMember) => {
    if (!window.confirm(`Remove ${member.name} from the team? They will no longer be able to log in.`)) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.STAFF, member.id));
      setStaff(prev => prev.filter(s => s.id !== member.id));
      toast.success(`${member.name} removed`);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to remove staff member."));
    }
  };

  // ── Agent: save (create or update) ───────────────────────────────────────────
  const resetAgentForm = () => {
    setAgentForm({ name: "", phone: "", vehicleNumber: "", storeId: "" });
    setEditingAgent(null);
    setShowAgentForm(false);
  };

  const openEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setAgentForm({
      name: agent.name,
      phone: agent.phone,
      vehicleNumber: agent.vehicleNumber,
      storeId: agent.storeId || "",
    });
    setShowAgentForm(true);
  };

  const saveAgent = async () => {
    if (!agentForm.name.trim() || !agentForm.phone.trim() || !agentForm.vehicleNumber.trim()) {
      toast.error("Name, phone, and vehicle number are required");
      return;
    }
    const phone = agentForm.phone.replace(/\D/g, "");
    if (phone.length !== 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    setSavingAgent(true);
    try {
      const payload: any = {
        name: agentForm.name.trim(),
        phone: `+91${phone}`,
        vehicleNumber: agentForm.vehicleNumber.trim().toUpperCase(),
        storeId: agentForm.storeId || null,
        updatedAt: serverTimestamp(),
      };

      if (editingAgent) {
        await updateDoc(doc(db, COLLECTIONS.AGENTS, editingAgent.id), payload);
        toast.success("Agent updated");
      } else {
        const newAgent = {
          ...payload,
          status: "offline",
          totalDeliveries: 0,
          rating: 0,
          createdAt: serverTimestamp(),
        };
        await addDoc(collection(db, COLLECTIONS.AGENTS), newAgent);
        toast.success(`${agentForm.name} added as delivery agent`);
      }
      resetAgentForm();
      await loadAgents();
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to save agent."));
    }
    setSavingAgent(false);
  };

  const toggleAgentStatus = async (agent: Agent) => {
    const newStatus = agent.status === "offline" ? "available" : "offline";
    try {
      await updateDoc(doc(db, COLLECTIONS.AGENTS, agent.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: newStatus as any } : a));
      toast.success(`${agent.name} is now ${newStatus}`);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to update agent status."));
    }
  };

  const deleteAgent = async (agent: Agent) => {
    if (!window.confirm(`Remove ${agent.name} as a delivery agent?`)) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.AGENTS, agent.id));
      setAgents(prev => prev.filter(a => a.id !== agent.id));
      toast.success(`${agent.name} removed`);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to remove agent."));
    }
  };

  const storeName = (storeId?: string) =>
    storeId ? (stores.find(s => s.id === storeId)?.name ?? storeId) : "All stores";

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-black">Team Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage staff accounts and delivery agents</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("staff")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            tab === "staff" ? "bg-emerald-500 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          <Users size={15} /> Staff ({staff.length})
        </button>
        <button
          onClick={() => setTab("agents")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            tab === "agents" ? "bg-emerald-500 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          <Bike size={15} /> Agents ({agents.length})
        </button>
      </div>

      {/* ── STAFF TAB ──────────────────────────────────────────────────────────── */}
      {tab === "staff" && (
        <div className="space-y-4">
          {/* Role legend */}
          <div className="grid grid-cols-5 gap-2 mb-2">
            {ROLES.map(r => (
              <div key={r.value} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${ROLE_BADGE[r.value]}`}>
                  {r.label}
                </span>
                <p className="text-gray-600 text-xs mt-2">{r.description}</p>
              </div>
            ))}
          </div>

          {/* Staff list */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-white font-bold text-sm">Staff Members</h2>
              <div className="flex gap-2">
                <button onClick={loadStaff} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={() => { setShowStaffForm(true); setStaffForm({ name: "", email: "", password: "", role: "support" }); }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-black font-bold rounded-xl text-sm hover:bg-emerald-400 transition-colors"
                >
                  <Plus size={14} /> Add Staff
                </button>
              </div>
            </div>

            {/* Create staff form */}
            {showStaffForm && (
              <div className="border-b border-gray-800 p-5 bg-gray-800/40">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-sm">New Staff Account</h3>
                  <button onClick={() => setShowStaffForm(false)} className="text-gray-500 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-gray-500 text-xs font-bold uppercase block mb-1.5">Full Name *</label>
                    <input
                      value={staffForm.name}
                      onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Ramesh Kumar"
                      className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs font-bold uppercase block mb-1.5">Email *</label>
                    <input
                      type="email"
                      value={staffForm.email}
                      onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="ramesh@greens.com"
                      className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs font-bold uppercase block mb-1.5">Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={staffForm.password}
                        onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="Min 8 characters"
                        className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 pr-10 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs font-bold uppercase block mb-1.5">Role *</label>
                    <select
                      value={staffForm.role}
                      onChange={e => setStaffForm(f => ({ ...f, role: e.target.value as UserRole }))}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                    >
                      {ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={createStaff}
                    disabled={creatingStaff}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-black font-bold rounded-xl text-sm hover:bg-emerald-400 disabled:opacity-60 transition-colors"
                  >
                    <ShieldCheck size={14} />
                    {creatingStaff ? "Creating..." : "Create Account"}
                  </button>
                  <button onClick={() => setShowStaffForm(false)} className="px-4 py-2.5 bg-gray-800 text-gray-400 font-semibold rounded-xl text-sm hover:bg-gray-700 transition-colors">
                    Cancel
                  </button>
                </div>
                <p className="text-gray-600 text-xs mt-3">
                  The staff member will log in at the admin portal with these credentials.
                  Share the password securely — you won't be able to view it again.
                </p>
              </div>
            )}

            {/* Staff table */}
            {staffLoading ? (
              <div className="py-10 text-center text-gray-600 text-sm">Loading...</div>
            ) : staff.length === 0 ? (
              <div className="py-10 text-center text-gray-600 text-sm">No staff members yet</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    {["Name", "Email", "Role", "Member Since", "Actions"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.map(member => (
                    <tr key={member.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-sm font-bold text-gray-300">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-white text-sm font-semibold">{member.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-sm">{member.email}</td>
                      <td className="px-5 py-3">
                        {editingRole?.id === member.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={editingRole.role}
                              onChange={e => setEditingRole({ id: member.id, role: e.target.value as UserRole })}
                              className="bg-gray-800 border border-gray-700 text-white px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                            >
                              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                            <button
                              onClick={updateStaffRole}
                              disabled={savingRole}
                              className="px-2 py-1 bg-emerald-500 text-black text-xs font-bold rounded-lg disabled:opacity-60"
                            >
                              {savingRole ? "..." : "Save"}
                            </button>
                            <button onClick={() => setEditingRole(null)} className="text-gray-500 hover:text-white">
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingRole({ id: member.id, role: member.role })}
                            className={`text-xs font-bold px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${ROLE_BADGE[member.role]}`}
                            title="Click to change role"
                          >
                            {ROLES.find(r => r.value === member.role)?.label ?? member.role}
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => deleteStaff(member)}
                          className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Remove staff member"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── AGENTS TAB ─────────────────────────────────────────────────────────── */}
      {tab === "agents" && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-white font-bold text-sm">Delivery Agents</h2>
              <div className="flex gap-2">
                <button onClick={loadAgents} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={() => { resetAgentForm(); setShowAgentForm(true); }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-black font-bold rounded-xl text-sm hover:bg-emerald-400 transition-colors"
                >
                  <Plus size={14} /> Add Agent
                </button>
              </div>
            </div>

            {/* Agent form */}
            {showAgentForm && (
              <div className="border-b border-gray-800 p-5 bg-gray-800/40">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-sm">
                    {editingAgent ? `Edit — ${editingAgent.name}` : "New Delivery Agent"}
                  </h3>
                  <button onClick={resetAgentForm} className="text-gray-500 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-gray-500 text-xs font-bold uppercase block mb-1.5">Full Name *</label>
                    <input
                      value={agentForm.name}
                      onChange={e => setAgentForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Suresh Babu"
                      className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs font-bold uppercase block mb-1.5">Phone *</label>
                    <div className="flex">
                      <span className="bg-gray-700 border border-gray-600 border-r-0 text-gray-400 px-3 py-2.5 rounded-l-xl text-sm">+91</span>
                      <input
                        type="tel"
                        value={agentForm.phone.replace(/^\+91/, "")}
                        onChange={e => setAgentForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                        placeholder="9876543210"
                        className="flex-1 bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-r-xl text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs font-bold uppercase block mb-1.5">Vehicle Number *</label>
                    <input
                      value={agentForm.vehicleNumber}
                      onChange={e => setAgentForm(f => ({ ...f, vehicleNumber: e.target.value.toUpperCase() }))}
                      placeholder="KA 01 AB 1234"
                      className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs font-bold uppercase block mb-1.5">Assigned Store</label>
                    <select
                      value={agentForm.storeId}
                      onChange={e => setAgentForm(f => ({ ...f, storeId: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">All stores (float)</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveAgent}
                    disabled={savingAgent}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-black font-bold rounded-xl text-sm hover:bg-emerald-400 disabled:opacity-60 transition-colors"
                  >
                    <Bike size={14} />
                    {savingAgent ? "Saving..." : editingAgent ? "Update Agent" : "Add Agent"}
                  </button>
                  <button onClick={resetAgentForm} className="px-4 py-2.5 bg-gray-800 text-gray-400 font-semibold rounded-xl text-sm hover:bg-gray-700 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Agent table */}
            {agentsLoading ? (
              <div className="py-10 text-center text-gray-600 text-sm">Loading...</div>
            ) : agents.length === 0 ? (
              <div className="py-10 text-center text-gray-600 text-sm">No agents added yet</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    {["Agent", "Phone", "Vehicle", "Store", "Status", "Deliveries", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agents.map(agent => (
                    <tr key={agent.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-sm font-bold text-gray-300">
                            {agent.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-white text-sm font-semibold">{agent.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm font-mono">{agent.phone}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm font-mono">{agent.vehicleNumber}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{storeName(agent.storeId)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleAgentStatus(agent)}
                          disabled={agent.status === "busy"}
                          title={agent.status === "busy" ? "Agent is on an active order" : "Click to toggle online/offline"}
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border transition-opacity ${AGENT_STATUS_BADGE[agent.status]} ${agent.status !== "busy" ? "hover:opacity-70 cursor-pointer" : "cursor-default"}`}
                        >
                          {agent.status}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm text-center">{agent.totalDeliveries}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditAgent(agent)}
                            className="p-1.5 text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Edit agent"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => deleteAgent(agent)}
                            disabled={agent.status === "busy"}
                            className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={agent.status === "busy" ? "Cannot remove an agent on an active order" : "Remove agent"}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
