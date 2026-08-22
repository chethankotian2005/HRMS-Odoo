import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { can } from "@/lib/rbac/policy";
import { renderToStream } from "@react-pdf/renderer";
import { SalarySlipPDF } from "@/lib/pdf/SalarySlipPDF";

export async function GET(req: Request, { params }: { params: { id: string, periodStart: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { id, periodStart } = params;

  const hasAccess = can(session.user as any, 'read', { type: 'PayrollRecord', ownerId: id, orgId: session.user.orgId });
  if (!hasAccess) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const startDate = new Date(periodStart);

  const payroll = await prisma.payrollRecord.findFirst({
    where: { employeeId: id, periodStart: startDate, orgId: session.user.orgId },
    include: {
      employee: {
        include: { department: true }
      }
    }
  });

  if (!payroll) {
    return new NextResponse("Payroll record not found", { status: 404 });
  }

  try {
    const parsedBreakdown = typeof payroll.breakdown === 'string' ? JSON.parse(payroll.breakdown) : payroll.breakdown;

    const stream = await renderToStream(
      <SalarySlipPDF 
        employee={payroll.employee as any} 
        payroll={{ ...payroll, breakdown: parsedBreakdown }} 
      />
    );

    const fileName = `salary-slip-${payroll.employee.firstName}-${new Date(payroll.periodStart).toISOString().slice(0, 7)}.pdf`;

    return new Response(stream as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error("[PDF Generation Error]", error);
    return new NextResponse("Internal Server Error generating PDF", { status: 500 });
  }
}
