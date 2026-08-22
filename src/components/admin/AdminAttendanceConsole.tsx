"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Download, ChevronLeft, ChevronRight, Edit, AlertCircle } from "lucide-react";

type Department = { id: string; name: string };
type Employee = { firstName: string; lastName: string; department: { name: string } | null };
type AttendanceRecord = {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  isSuspectedProxy: boolean;
  employee: Employee;
};

export default function AdminAttendanceConsole({ departments }: { departments: Department[] }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [page, setPage] = useState(1);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [departmentId, setDepartmentId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isSuspectedProxy, setIsSuspectedProxy] = useState(false);

  // Override Modal
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [overrideStatus, setOverrideStatus] = useState("PRESENT");
  const [overrideProxy, setOverrideProxy] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(date && { date }),
        ...(departmentId && { departmentId }),
        ...(statusFilter && { status: statusFilter }),
        ...(isSuspectedProxy && { isSuspectedProxy: "true" })
      });

      const res = await fetch(`/api/admin/attendance?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch records");
      
      setRecords(data.records);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, date, departmentId, statusFilter, isSuspectedProxy]);

  const handleExport = () => {
    const params = new URLSearchParams({
      ...(date && { date }),
      ...(departmentId && { departmentId }),
      ...(statusFilter && { status: statusFilter }),
      ...(isSuspectedProxy && { isSuspectedProxy: "true" })
    });
    window.location.href = `/api/admin/attendance/export?${params.toString()}`;
  };

  const openOverrideModal = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setOverrideStatus(record.status);
    setOverrideProxy(record.isSuspectedProxy);
    setOverrideReason("");
  };

  const submitOverride = async () => {
    if (!editingRecord) return;
    if (!overrideReason.trim()) {
      alert("Reason is required");
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/attendance/${editingRecord.id}/override`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: overrideStatus,
          isSuspectedProxy: overrideProxy,
          reason: overrideReason
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to override");
      
      setEditingRecord(null);
      fetchRecords();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Attendance Console</h1>
        <button 
          onClick={handleExport}
          className="flex items-center px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5 flex-1 min-w-[150px]">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Date</label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => { setDate(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent"
          />
        </div>
        
        <div className="space-y-1.5 flex-1 min-w-[150px]">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Department</label>
          <select 
            value={departmentId} 
            onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-1.5 flex-1 min-w-[150px]">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</label>
          <select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="ABSENT">Absent</option>
            <option value="LEAVE">Leave</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2 pb-2 min-w-[150px]">
          <input 
            type="checkbox" 
            id="proxyFilter"
            checked={isSuspectedProxy} 
            onChange={(e) => { setIsSuspectedProxy(e.target.checked); setPage(1); }}
            className="rounded border-zinc-300"
          />
          <label htmlFor="proxyFilter" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
            Proxy Flagged Only
          </label>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Check In</th>
                <th className="px-6 py-4 font-medium">Check Out</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Proxy</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-zinc-500">No records found.</td></tr>
              ) : (
                records.map(record => (
                  <tr key={record.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-6 py-4 font-medium">
                      {record.employee.firstName} {record.employee.lastName}
                    </td>
                    <td className="px-6 py-4 text-zinc-500">{record.employee.department?.name || "-"}</td>
                    <td className="px-6 py-4">{record.checkIn ? format(new Date(record.checkIn), "h:mm a") : "-"}</td>
                    <td className="px-6 py-4">{record.checkOut ? format(new Date(record.checkOut), "h:mm a") : "-"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium
                        ${record.status === 'PRESENT' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                          record.status === 'HALF_DAY' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                          record.status === 'ABSENT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                          'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {record.isSuspectedProxy && (
                        <span className="inline-flex items-center text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded text-xs font-medium">
                          <AlertCircle className="w-3 h-3 mr-1" /> Yes
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openOverrideModal(record)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Override Record"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
          <div className="text-sm text-zinc-500">
            Showing {records.length > 0 ? (page - 1) * 10 + 1 : 0} to {Math.min(page * 10, total)} of {total} records
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-md border border-zinc-300 dark:border-zinc-700 disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">Page {page} of {totalPages || 1}</span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-md border border-zinc-300 dark:border-zinc-700 disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Override Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold">Override Attendance Record</h3>
              <p className="text-sm text-zinc-500">
                {editingRecord.employee.firstName} {editingRecord.employee.lastName} on {format(new Date(editingRecord.date), "MMM d, yyyy")}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Status</label>
                <select 
                  value={overrideStatus}
                  onChange={e => setOverrideStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent"
                >
                  <option value="PRESENT">Present</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LEAVE">Leave</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input 
                  type="checkbox" 
                  id="overrideProxy"
                  checked={overrideProxy} 
                  onChange={(e) => setOverrideProxy(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                <label htmlFor="overrideProxy" className="text-sm font-medium cursor-pointer">
                  Suspected Proxy (Flag)
                </label>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-sm font-medium">Reason for Override (Required)</label>
                <textarea 
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  placeholder="e.g. Cleared proxy flag after verification"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent resize-none h-24"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex justify-end space-x-3">
              <button 
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-md font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button 
                onClick={submitOverride}
                disabled={!overrideReason.trim()}
                className="px-4 py-2 rounded-md font-medium bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
