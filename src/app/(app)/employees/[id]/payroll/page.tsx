import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { can } from "@/lib/rbac/policy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PayrollTableClient from "./PayrollTableClient";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function EmployeePayrollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect("/login");

  let targetId = id;
  if (targetId === "me") {
    targetId = (session.user as any).employeeId;
    if (!targetId) return notFound();
  }

  const hasAccess = can(session.user as any, 'read', { type: 'PayrollRecord', ownerId: targetId, orgId: session.user.orgId });
  
  if (!hasAccess) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">Forbidden</h1>
        <p>You do not have permission to view payroll records for this employee.</p>
      </div>
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { id: targetId },
    select: { firstName: true, lastName: true }
  });

  if (!employee) return notFound();

  // Fetch up to 6 latest payroll records
  const records = await prisma.payrollRecord.findMany({
    where: { employeeId: targetId, orgId: session.user.orgId },
    orderBy: { periodStart: 'desc' },
    take: 6,
  });

  const latestRecord = records[0];

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/employees/${id}`}>
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Payroll: {employee.firstName} {employee.lastName}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Current Gross</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${latestRecord?.grossPay.toLocaleString() || '0'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Deductions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">-${latestRecord?.deductions.toLocaleString() || '0'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">LOP Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestRecord?.lopDays || '0'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Net Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{latestRecord?.netPay.toLocaleString() || '0'}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>6-Month History</CardTitle>
        </CardHeader>
        <CardContent>
          <PayrollTableClient records={records} />
        </CardContent>
      </Card>
    </div>
  );
}
