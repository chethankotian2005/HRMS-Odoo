"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ConflictWarning { date: string; capacityPercent: number; onLeave: { name: string; leaveType: string }[] }
interface LeaveRequest {
  id: string; status: string; halfDay: boolean; reason?: string;
  startDate: string; endDate: string;
  employee: { firstName: string; lastName: string; email: string; department?: { name: string } };
  leaveType: { name: string; daysAllowed: number };
  conflicts: { hasConflict: boolean; warnings: ConflictWarning[]; minCapacityPercent: number };
  remainingBalance: number;
}

const statusColor: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default function AdminLeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [tab, setTab] = useState("PENDING");

  const fetchRequests = (status: string) => {
    setLoading(true);
    fetch(`/api/admin/leave?status=${status}`)
      .then((r) => r.json())
      .then((d) => { setRequests(d.requests ?? []); setLoading(false); });
  };

  useEffect(() => { fetchRequests(tab); }, [tab]);

  const handleApprove = async (id: string) => {
    if (!confirm("Approve this leave request?")) return;
    const res = await fetch(`/api/admin/leave/${id}/approve`, { method: "POST" });
    if (res.ok) fetchRequests(tab);
    else alert("Failed to approve. Please try again.");
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    const res = await fetch(`/api/admin/leave/${rejectModal.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejectionReason }),
    });
    if (res.ok) { setRejectModal(null); setRejectionReason(""); fetchRequests(tab); }
    else alert("Failed to reject. Please provide a reason.");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave Approval Queue</h1>
        <p className="text-sm text-gray-500 mt-1">Review, approve, or reject employee leave requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {["PENDING", "APPROVED", "REJECTED"].map((s) => (
          <button key={s} onClick={() => setTab(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === s ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : requests.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-gray-400">No {tab.toLowerCase()} leave requests.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <Card key={r.id} className={`border shadow-sm ${r.conflicts?.hasConflict ? "border-red-300" : "border-gray-100"}`}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {r.employee.firstName} {r.employee.lastName}
                      <span className="ml-2 text-xs text-gray-400">{r.employee.email}</span>
                    </p>
                    <p className="text-xs text-gray-500">{r.employee.department?.name ?? "No Department"}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[r.status]}`}>{r.status}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-gray-400 text-xs">Type</span><p className="font-medium">{r.leaveType.name}</p></div>
                  <div><span className="text-gray-400 text-xs">From</span><p>{new Date(r.startDate).toLocaleDateString("en-IN")}</p></div>
                  <div><span className="text-gray-400 text-xs">To</span><p>{new Date(r.endDate).toLocaleDateString("en-IN")}</p></div>
                  <div>
                    <span className="text-gray-400 text-xs">Remaining Balance</span>
                    <p className={r.remainingBalance < 0 ? "text-red-600 font-semibold" : "font-medium"}>{r.remainingBalance} days</p>
                  </div>
                </div>

                {r.reason && <p className="text-sm text-gray-500 italic">Reason: "{r.reason}"</p>}

                {/* Conflict Warning Banner */}
                {r.conflicts?.warnings?.length > 0 && (
                  <div className="rounded-md border border-orange-200 bg-orange-50 p-3 space-y-1">
                    <p className="text-sm font-medium text-orange-800">
                      Approving this drops department capacity to {r.conflicts.minCapacityPercent}%
                    </p>
                    {r.conflicts.warnings.slice(0, 3).map((w) => (
                      <p key={w.date} className="text-xs text-orange-700">
                        {w.date}: {w.onLeave.map((e) => `${e.name} (${e.leaveType})`).join(", ")} already on leave
                      </p>
                    ))}
                  </div>
                )}

                {r.status === "PENDING" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => handleApprove(r.id)} className="bg-green-600 hover:bg-green-700">Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => setRejectModal({ id: r.id })}
                      className="text-red-600 border-red-200 hover:bg-red-50">Reject</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Reject Leave Request</h2>
            <p className="text-sm text-gray-500">Please provide a mandatory reason for rejection.</p>
            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
              rows={3} placeholder="Enter rejection reason (min 5 characters)..."
              className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setRejectModal(null); setRejectionReason(""); }}>Cancel</Button>
              <Button onClick={handleReject} className="bg-red-600 hover:bg-red-700" disabled={rejectionReason.length < 5}>Confirm Reject</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}