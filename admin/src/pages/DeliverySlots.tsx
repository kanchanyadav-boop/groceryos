// admin/src/pages/DeliverySlots.tsx
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";
import { COLLECTIONS } from "../../../shared/config";
import { SlotConfig, DeliverySlotsConfig } from "../../../shared/types";
import { Clock, Plus, Trash2, Save, Info } from "lucide-react";
import { friendlyError } from "../lib/errors";

const DEFAULT_CONFIG: DeliverySlotsConfig = {
  slots: [
    { id: "AM", name: "Morning", emoji: "🌅", timeRange: "9am – 1pm", cutoffHour: 7, capacityPerDay: 50, isActive: true },
    { id: "PM", name: "Evening", emoji: "🌇", timeRange: "2pm – 7pm", cutoffHour: 12, capacityPerDay: 50, isActive: true },
  ],
  advanceDays: 3,
};

export default function DeliverySlots() {
  const [config, setConfig] = useState<DeliverySlotsConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, "deliverySlots"));
        if (snap.exists()) setConfig(snap.data() as DeliverySlotsConfig);
      } catch {
        // use defaults
      }
      setLoading(false);
    };
    load();
  }, []);

  const updateSlot = (idx: number, field: keyof SlotConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      slots: prev.slots.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  };

  const removeSlot = (idx: number) => {
    setConfig(prev => ({ ...prev, slots: prev.slots.filter((_, i) => i !== idx) }));
  };

  const addSlot = () => {
    const newId = `SLOT${config.slots.length + 1}`;
    setConfig(prev => ({
      ...prev,
      slots: [...prev.slots, {
        id: newId, name: "", emoji: "📦", timeRange: "", cutoffHour: 0, capacityPerDay: 20, isActive: true,
      }],
    }));
  };

  const save = async () => {
    if (config.slots.some(s => !s.id || !s.name || !s.timeRange)) {
      toast.error("Fill slot ID, name and time range for all slots");
      return;
    }
    const ids = config.slots.map(s => s.id);
    if (new Set(ids).size !== ids.length) {
      toast.error("Slot IDs must be unique");
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, COLLECTIONS.SETTINGS, "deliverySlots"), {
        ...config,
        updatedAt: serverTimestamp(),
      });
      toast.success("Delivery slots saved");
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to save slot configuration. Please try again."));
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-3 text-gray-600">
        <Clock size={16} className="animate-pulse" />
        Loading slot configuration...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-black">Delivery Slots</h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure time windows and booking rules. Changes take effect immediately.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 disabled:opacity-60 transition-colors"
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 text-sm text-blue-300">
        <Info size={16} className="flex-shrink-0 mt-0.5" />
        <p>
          <strong>Cutoff hour</strong> controls same-day ordering. If it's 8am and a slot's cutoff is 7, customers
          cannot pick that slot for today — they'll only see tomorrow onwards. Future-day slots are always
          shown if active.
        </p>
      </div>

      {/* Advance booking days */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4">
        <h2 className="text-white font-bold mb-1">Advance Booking Window</h2>
        <p className="text-gray-500 text-xs mb-4">How many days ahead can customers choose a delivery date?</p>
        <div className="flex items-center gap-3">
          {[1, 2, 3, 5, 7].map(d => (
            <button
              key={d}
              onClick={() => setConfig(prev => ({ ...prev, advanceDays: d }))}
              className={`w-12 h-12 rounded-xl font-bold text-sm transition-colors ${
                config.advanceDays === d
                  ? "bg-emerald-500 text-black"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Slot cards */}
      <div className="space-y-3">
        {config.slots.map((slot, idx) => (
          <div
            key={idx}
            className={`bg-gray-900 border rounded-2xl p-5 transition-colors ${
              slot.isActive ? "border-gray-800" : "border-gray-800/50 opacity-60"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{slot.emoji || "📦"}</span>
                <span className="text-white font-bold">{slot.name || "New Slot"}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                  slot.isActive
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-gray-800 text-gray-500 border-gray-700"
                }`}>
                  {slot.isActive ? "Active" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Toggle */}
                <button
                  onClick={() => updateSlot(idx, "isActive", !slot.isActive)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${slot.isActive ? "bg-emerald-500" : "bg-gray-700"}`}
                  title={slot.isActive ? "Disable slot" : "Enable slot"}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${slot.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
                <button
                  onClick={() => removeSlot(idx)}
                  className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Row 1: ID, Name, Emoji */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-gray-500 text-xs font-semibold block mb-1.5">Slot ID *</label>
                <input
                  value={slot.id}
                  onChange={e => updateSlot(idx, "id", e.target.value.toUpperCase().replace(/\s/g, ""))}
                  placeholder="AM"
                  className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-gray-500 text-xs font-semibold block mb-1.5">Display Name *</label>
                <input
                  value={slot.name}
                  onChange={e => updateSlot(idx, "name", e.target.value)}
                  placeholder="Morning"
                  className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-gray-500 text-xs font-semibold block mb-1.5">Emoji</label>
                <input
                  value={slot.emoji}
                  onChange={e => updateSlot(idx, "emoji", e.target.value)}
                  placeholder="🌅"
                  className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Row 2: Time range, Cutoff, Capacity */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-gray-500 text-xs font-semibold block mb-1.5">Time Range *</label>
                <input
                  value={slot.timeRange}
                  onChange={e => updateSlot(idx, "timeRange", e.target.value)}
                  placeholder="9am – 1pm"
                  className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-gray-500 text-xs font-semibold block mb-1.5">
                  Same-day Cutoff (hour)
                </label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={slot.cutoffHour}
                  onChange={e => updateSlot(idx, "cutoffHour", Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
                <p className="text-gray-600 text-xs mt-1">
                  Cut off at {slot.cutoffHour}:00 today
                </p>
              </div>
              <div>
                <label className="text-gray-500 text-xs font-semibold block mb-1.5">Orders / Day</label>
                <input
                  type="number"
                  min={1}
                  value={slot.capacityPerDay}
                  onChange={e => updateSlot(idx, "capacityPerDay", Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Add slot */}
        <button
          onClick={addSlot}
          className="w-full py-4 border border-dashed border-gray-700 text-gray-500 hover:text-emerald-400 hover:border-emerald-500/50 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add New Slot
        </button>
      </div>
    </div>
  );
}
