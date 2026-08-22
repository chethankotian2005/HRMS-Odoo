import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { AdminEmployeeTable } from "./admin-employee-table";
import { Prisma } from "@prisma/client";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  // Redirect employees out of the admin dashboard
  if (session.user.role === "EMPLOYEE") {
    redirect("/dashboard");
  }

  const orgId = session.user.orgId;

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // 1. Fetch Today's Attendance Summary
  const todayAttendances = await prisma.attendanceRecord.groupBy({
    by: ['status'],
    where: { orgId, date: todayStart },
    _count: { status: true },
  });

  const presentCount = todayAttendances.find(a => a.status === 'PRESENT')?._count.status || 0;
  const absentCount = todayAttendances.find(a => a.status === 'ABSENT')?._count.status || 0;
  const halfDayCount = todayAttendances.find(a => a.status === 'HALF_DAY')?._count.status || 0;
  
  // People on leave today
  const onLeaveCount = await prisma.leaveRequest.count({
    where: {
      orgId,
      status: "APPROVED",
      startDate: { lte: todayStart },
      endDate: { gte: todayStart },
    }
  });

  // 2. Pending Leave Approvals
  const pendingLeavesCount = await prisma.leaveRequest.count({
    where: { orgId, status: "PENDING" }
  });

  // 3. Paginated Employee List
  const page = typeof searchParams.page === "string" ? parseInt(searchParams.page, 10) : 1;
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const dept = typeof searchParams.dept === "string" ? searchParams.dept : "";

  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const whereClause: Prisma.EmployeeWhereInput = {
    orgId,
    ...(dept ? { departmentId: dept } : {}),
    ...(q ? {
      OR: [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } }, // Sometimes employee code is in user or id
      ]
    } : {})
  };

  const [employees, totalEmployees, departments] = await Promise.all([
    prisma.employee.findMany({
      where: whereClause,
      include: { department: true, user: true },
      skip,
      take: pageSize,
      orderBy: { firstName: "asc" },
    }),
    prisma.employee.count({ where: whereClause }),
    prisma.department.findMany({ where: { orgId }, orderBy: { name: "asc" } })
  ]);

  const totalPages = Math.ceil(totalEmployees / pageSize);

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{absentCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Half Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{halfDayCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On Leave</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{onLeaveCount}</div>
          </CardContent>
        </Card>

        <Link href="/admin/leave" className="block transition-transform hover:scale-[1.02]">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Pending Leaves</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{pendingLeavesCount}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <AdminEmployeeTable 
        employees={employees} 
        departments={departments}
        total={totalEmployees}
        totalPages={totalPages}
        currentPage={page}
        currentQuery={q}
        currentDept={dept}
      />
    </div>
  );
}
