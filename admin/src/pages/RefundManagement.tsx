// admin/src/pages/RefundManagement.tsx
import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { COLLECTIONS } from "../../shared/config";
import { Refund, RefundStatus } from "../../shared/types";
import { format } from "date-fns";
import { toDate } from "../lib/utils";
import { CheckCircle, XCircle, Clock, X } from "lucide-react";
import { friendlyError } from "../lib/errors";

// NOTE: Actual Razorpay refund API call happens in Cloud Functions
// This UI triggers the Cloud Function via Firestore status update
// Cloud Function watches /refunds where status == "approved" and calls Razorpay

const STATUS_STYLES: Record<RefundStatus, { color: string; icon: any }> = {
  pending:   { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: Clock },
  approved:  { color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: CheckCircle },
  processed: { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
  rejected:  { color: "bg-red-500/15 text-red-400 border-red-500/30", icon: XCircle },
};

export default function RefundManagement() {
  const { staffProfile } = useAuth();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RefundStatus | "all">("pending");
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; reason: string } | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, COLLECTIONS.REFUNDS), orderBy("createdAt", "desc"), limit(300)),
      snap => {
        setRefunds(snap.docs.map(d => ({ id: d.id, ...d.data() } as Refund)));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const approveRefund = async (refundId: string) => {
    setProcessing(refundId);
    try {
      // Setting status to "approved" triggers the Cloud Function
      // which calls Razorpay API and sets status to "processed"
      await updateDoc(doc(db, COLLECTIONS.REFUNDS, refundId), {
        status: "approved",
        approvedBy: staffProfile?.id || "admin",
        updatedAt: serverTimestamp(),
      });
      toast.success("Refund approved — processing via Razorpay");
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to approve refund. Please try again."));
    }
    setProcessing(null);
  };

  const rejectRefund = async (refundId: string, reason: string) => {
    setProcessing(refundId);
    try {
      await updateDoc(doc(db, COLLECTIONS.REFUNDS, refundId), {
        status: "rejected",
        rejectionReason: reason,
        approvedBy: staffProfile?.id || "admin",
        updatedAt: serverTimestamp(),
      });
      toast.success("Refund request rejected");
      setRejectModal(null);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to reject refund. Please try again."));
    }
    setProcessing(null);
  };

  const filtered = filter === "all" ? refunds : refunds.filter(r => r.status === filter);

  const stats = {
    pending: refunds.filter(r => r.status === "pending").length,
    processed: refunds.filter(r => r.status === "processed").length,
    totalProcessed: refunds.filter(r => r.status === "processed").reduce((a, r) => a + r.amount, 0),
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-black">Refund Management</h1>
        <p className="text-gray-500 text-sm mt-1">Approve or reject refund requests · Razorpay API auto-processes approved refunds</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5">
          <div className="text-2xl font-black text-yellow-400">{stats.pending}</div>
          <div className="text-gray-500 text-xs mt-1">Pending Approval</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
          <div className="text-2xl font-black text-emerald-400">{stats.processed}</div>
          <div className="text-gray-500 text-xs mt-1">Processed</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
          <div className="text-2xl font-black text-blue-400">₹{stats.totalProcessed.toLocaleString()}</div>
          <div className="text-gray-500 text-xs mt-1">Total Refunded</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5">
        {(["all", "pending", "approved", "processed", "rejected"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${filter === f ? "bg-emerald-500 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              {["Refund ID", "Order", "Amount", "Reason", "Requested", "Status", "Razorpay Ref", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((refund, i) => {
              const style = STATUS_STYLES[refund.status];
              return (
                <tr key={refund.id} className={`border-b border-gray-800/50 ${i % 2 === 0 ? "" : "bg-gray-900/50"}`}>
                  <td className="px-4 py-3 text-emerald-400 text-xs font-mono">#{refund.id.slice(-6).toUpperCase()}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">#{refund.orderId?.slice(-6).toUpperCase()}</td>
                  <td className="px-4 py-3 text-white font-bold text-sm">₹{refund.amount}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm max-w-[200px] truncate">{refund.reason}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {refund.createdAt ? format(toDate(refund.createdAt)!, "dd MMM, hh:mm a") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border capitalize ${style.color}`}>
                      {refund.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                    {refund.razorpayRefundId || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {refund.status === "pending" && (
                      <div className="flex gap-2">
                        <button onClick={() => approveRefund(refund.id)} disabled={processing === refund.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg hover:bg-emerald-500/30 disabled:opacity-50">
                          <CheckCircle size={12} /> Approve
                        </button>
                        <button onClick={() => setRejectModal({ id: refund.id, reason: "" })}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-500/30">
                          <XCircle size={12} /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && <div className="py-12 text-center text-gray-600 text-sm">Loading refunds...</div>}
        {!loading && filtered.length === 0 && <div className="py-12 text-center text-gray-600 text-sm">No refunds in this filter</div>}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-black">Reject Refund</h3>
              <button onClick={() => setRejectModal(null)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-gray-400 text-sm mb-4">Please provide a reason for rejecting this refund request.</p>
            <textarea
              value={rejectModal.reason}
              onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="Reason for rejection..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-xl font-semibold text-sm">Cancel</button>
              <button
                onClick={() => rejectRefund(rejectModal.id, rejectModal.reason)}
                disabled={!rejectModal.reason.trim()}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-400 disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
