"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  status: string;
  reason?: string;
  leaveType: { name: string };
}

interface LeaveBalance { leaveTypeId: string; leaveTypeName: string; balance: number; allowed: number; }

const statusColor: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export default function LeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leave/request").then((r) => r.json()).then((d) => {
      setRequests(d.requests ?? []);
      setLoading(false);
    });
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this leave request?")) return;
    await fetch(`/api/leave/request/${id}`, { method: "DELETE" });
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "CANCELLED" } : r));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Leave Requests</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage your time-off requests</p>
        </div>
        <Link href="/leave/apply">
          <Button>+ Apply for Leave</Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-400">
            No leave requests yet. <Link href="/leave/apply" className="text-blue-600 hover:underline">Apply now</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{r.leaveType.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[r.status]}`}>
                      {r.status}
                    </span>
                    {r.halfDay && <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">Half Day</span>}
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(r.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {" → "}
                    {new Date(r.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  {r.reason && <p className="text-xs text-gray-400 italic">"{r.reason}"</p>}
                </div>
                {r.status === "PENDING" && (
                  <Button variant="outline" size="sm" onClick={() => handleCancel(r.id)}
                    className="text-red-600 border-red-200 hover:bg-red-50">
                    Cancel
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}