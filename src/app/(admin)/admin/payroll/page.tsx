import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminPayrollClient from "./AdminPayrollClient";

export default async function AdminPayrollPage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect("/login");

  if (session.user.role !== 'ADMIN' && session.user.role !== 'HR') {
    return (
      <div className="p-8 text-center text-red-500 text-xl font-bold">
        Forbidden: You do not have access to the Admin Payroll Console.
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const { month, year } = await searchParams;
  const targetYear = parseInt(year || currentYear.toString());
  const targetMonth = parseInt(month || currentMonth.toString());

  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0);

  const employees = await prisma.employee.findMany({
    where: { orgId: session.user.orgId, deletedAt: null },
    include: {
      salaryStructures: {
        where: { effectiveFrom: { lte: endDate } },
        orderBy: { effectiveFrom: 'desc' },
        take: 1,
      },
      payrollRecords: {
        where: { periodStart: startDate, periodEnd: endDate },
        take: 1,
      }
    }
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Payroll Console</h1>
      <AdminPayrollClient 
        employees={employees} 
        currentYear={targetYear} 
        currentMonth={targetMonth} 
      />
    </div>
  );
}
