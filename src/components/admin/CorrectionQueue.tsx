"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";

type Request = {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  reason: string;
  status: string;
  employee: { firstName: string; lastName: string; department: { name: string } | null };
};

export default function CorrectionQueue() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("PENDING");

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/attendance/correction?page=${page}&limit=10&status=${statusFilter}`);
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests);
        setTotalPages(data.totalPages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const handleAction = async (id: string, actionStatus: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch(`/api/admin/attendance/correction/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: actionStatus })
      });
      if (res.ok) {
        fetchRequests();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to process request");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Attendance Correction Queue</h2>
        <select 
          value={statusFilter} 
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
              <tr>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Proposed Check In</th>
                <th className="px-6 py-4 font-medium">Proposed Check Out</th>
                <th className="px-6 py-4 font-medium">Reason</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center">Loading...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-zinc-500">No requests found.</td></tr>
              ) : (
                requests.map(req => (
                  <tr key={req.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-6 py-4 font-medium">{req.employee.firstName} {req.employee.lastName}</td>
                    <td className="px-6 py-4">{format(new Date(req.date), "MMM d, yyyy")}</td>
                    <td className="px-6 py-4">{req.checkIn ? format(new Date(req.checkIn), "h:mm a") : "-"}</td>
                    <td className="px-6 py-4">{req.checkOut ? format(new Date(req.checkOut), "h:mm a") : "-"}</td>
                    <td className="px-6 py-4 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {req.status === "PENDING" && (
                        <>
                          <button onClick={() => handleAction(req.id, "APPROVED")} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Approve">
                            <Check className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleAction(req.id, "REJECTED")} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Reject">
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center space-x-2 ml-auto">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded border hover:bg-zinc-50 disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">Page {page} of {totalPages || 1}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded border hover:bg-zinc-50 disabled:opacity-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
