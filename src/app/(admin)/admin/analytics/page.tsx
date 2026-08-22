import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
    redirect("/login");
  }

  const orgId = session.user.orgId;

  // 1. Headcount by department (SQL groupBy)
  const hcGroup = await prisma.employee.groupBy({
    by: ['departmentId'],
    _count: { id: true },
    where: { orgId, deletedAt: null }
  });
  const depts = await prisma.department.findMany({ where: { orgId } });
  const headcountData = hcGroup.map(g => ({
    name: depts.find(d => d.id === g.departmentId)?.name || 'Unassigned',
    count: g._count.id
  }));

  // 2. Leave utilization by type (SQL groupBy)
  const leaveGroup = await prisma.leaveBalanceLedger.groupBy({
    by: ['leaveTypeId'],
    _sum: { delta: true },
    where: { orgId, reason: 'APPROVED' }
  });
  const leaveTypes = await prisma.leaveType.findMany({ where: { orgId } });
  const leaveData = leaveGroup.map(g => ({
    name: leaveTypes.find(lt => lt.id === g.leaveTypeId)?.name || 'Unknown',
    utilized: Math.abs(g._sum.delta || 0)
  }));

  // 3. Payroll cost trend (SQL groupBy)
  const payrollGroup = await prisma.payrollRecord.groupBy({
    by: ['periodStart'],
    _sum: { grossPay: true, netPay: true },
    where: { orgId }
  });
  const payrollData = payrollGroup
    .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime())
    .map(g => ({
      month: g.periodStart.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
      gross: g._sum.grossPay || 0,
      net: g._sum.netPay || 0
    }));

  // 4. Top Absentees (SQL groupBy)
  const absenteesGroup = await prisma.attendanceRecord.groupBy({
    by: ['employeeId'],
    _count: { id: true },
    where: { orgId, status: 'ABSENT' },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  });
  const absEmployees = await prisma.employee.findMany({
    where: { id: { in: absenteesGroup.map(g => g.employeeId) } }
  });
  const absenteesData = absenteesGroup.map(g => {
    const emp = absEmployees.find(e => e.id === g.employeeId);
    return {
      name: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
      absences: g._count.id
    };
  });

  // 5. Monthly attendance rate trend (SQL groupBy exact date + status)
  const currentYear = new Date().getFullYear();
  const attGroup = await prisma.attendanceRecord.groupBy({
    by: ['date', 'status'],
    _count: { id: true },
    where: { 
      orgId, 
      date: { gte: new Date(currentYear, 0, 1), lte: new Date(currentYear, 11, 31) } 
    }
  });

  // Bucket SQL aggregations into months in JS
  const monthlyAttMap: Record<number, { present: number, absent: number }> = {};
  attGroup.forEach(g => {
    const m = g.date.getMonth();
    if (!monthlyAttMap[m]) monthlyAttMap[m] = { present: 0, absent: 0 };
    if (g.status === 'PRESENT') monthlyAttMap[m].present += g._count.id;
    if (g.status === 'ABSENT') monthlyAttMap[m].absent += g._count.id;
  });

  const attendanceRateData = Array.from({ length: 12 }).map((_, i) => {
    const stats = monthlyAttMap[i] || { present: 0, absent: 0 };
    const total = stats.present + stats.absent;
    const rate = total > 0 ? (stats.present / total) * 100 : 0;
    return {
      month: new Date(currentYear, i, 1).toLocaleDateString(undefined, { month: 'short' }),
      rate: parseFloat(rate.toFixed(1))
    };
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>
      <DashboardClient 
        headcountData={headcountData}
        leaveData={leaveData}
        payrollData={payrollData}
        absenteesData={absenteesData}
        attendanceRateData={attendanceRateData}
      />
    </div>
  );
}
