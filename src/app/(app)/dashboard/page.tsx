import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function EmployeeDashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  // Redirect admins out of the employee dashboard
  if (session.user.role === "ADMIN" || session.user.role === "HR") {
    redirect("/admin/dashboard");
  }

  const employeeId = session.user.employeeId;
  const orgId = session.user.orgId;

  if (!employeeId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">No Employee Profile Found</h1>
        <p>Your user account is not linked to an employee profile.</p>
      </div>
    );
  }

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  // 1. Fetch Today's Attendance
  const todayAttendance = await prisma.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId, date: todayStart } }
  });

  // 2. Fetch Month's Present Days
  const monthAttendanceCount = await prisma.attendanceRecord.count({
    where: { 
      employeeId, 
      date: { gte: monthStart },
      status: { in: ["PRESENT", "HALF_DAY"] }
    }
  });

  // 3. Fetch Pending Leave Requests
  const pendingLeavesCount = await prisma.leaveRequest.count({
    where: { employeeId, status: "PENDING" }
  });

  // 4. Fetch Latest Payroll
  const latestPayroll = await prisma.payrollRecord.findFirst({
    where: { employeeId, status: "FINALIZED" },
    orderBy: { periodEnd: "desc" }
  });

  // 5. Gather Recent Activity
  const audits = await prisma.auditLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  const attendances = await prisma.attendanceRecord.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  const leaves = await prisma.leaveRequest.findMany({
    where: { employeeId },
    orderBy: { updatedAt: "desc" },
    take: 5
  });

  // Merge and sort
  const activities = [
    ...audits.map(a => ({ id: a.id, title: `Profile updated: ${a.action}`, date: a.createdAt, type: "profile" })),
    ...attendances.map(a => ({ id: a.id, title: `Checked in at ${a.checkIn?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'unknown'}`, date: a.createdAt, type: "attendance" })),
    ...leaves.map(l => ({ id: l.id, title: `Leave request ${l.status.toLowerCase()}`, date: l.updatedAt, type: "leave" }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/employees/me" className="block transition-transform hover:scale-[1.02]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {todayAttendance ? (
                  <Badge variant={todayAttendance.checkOut ? "secondary" : "default"}>
                    {todayAttendance.checkOut ? "Checked Out" : "Checked In"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Not Checked In</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/attendance" className="block transition-transform hover:scale-[1.02]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Month's Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthAttendanceCount} days</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/leave" className="block transition-transform hover:scale-[1.02]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Leaves</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingLeavesCount}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/payroll" className="block transition-transform hover:scale-[1.02]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Latest Net Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestPayroll ? `₹${latestPayroll.netPay.toLocaleString()}` : "N/A"}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent activity found.
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((act, index) => (
                <div key={index} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{act.title}</span>
                    <span className="text-xs text-muted-foreground capitalize">{act.type}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(act.date, { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
