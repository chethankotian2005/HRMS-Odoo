import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { computeNetPay } from "@/lib/payroll/compute";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== 'ADMIN' && session.user.role !== 'HR') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { year, month } = body; 

    if (!year || !month) {
      return NextResponse.json({ error: "Missing year or month" }, { status: 400 });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const workingDaysInMonth = 22; // Default proxy

    const employees = await prisma.employee.findMany({
      where: { orgId: session.user.orgId, deletedAt: null },
      include: {
        salaryStructures: {
          where: { effectiveFrom: { lte: endDate } },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        }
      }
    });

    const results = [];

    for (const emp of employees) {
      if (emp.salaryStructures.length === 0) continue; 

      const activeStruct = emp.salaryStructures[0];

      const absences = await prisma.attendanceRecord.count({
        where: {
          employeeId: emp.id,
          date: { gte: startDate, lte: endDate },
          status: 'ABSENT'
        }
      });

      const breakdown = computeNetPay(
        { basic: activeStruct.basicSalary, hra: activeStruct.hra, allowances: activeStruct.allowances },
        { workingDaysInMonth, absentDays: absences },
        { unpaidLeaves: 0, paidLeavesTaken: 0, sickLeavesTaken: 0 },
        { paid: 0, sick: 0 }
      );

      const existingRecord = await prisma.payrollRecord.findFirst({
        where: { employeeId: emp.id, periodStart: startDate, periodEnd: endDate }
      });

      if (existingRecord && existingRecord.status === 'FINALIZED') {
        continue; 
      }

      const payrollData = {
        orgId: session.user.orgId,
        employeeId: emp.id,
        periodStart: startDate,
        periodEnd: endDate,
        basicSalary: breakdown.basic,
        hra: breakdown.hra,
        allowances: breakdown.allowances,
        grossPay: breakdown.grossPay,
        pf: breakdown.deductions.pf,
        professionalTax: breakdown.deductions.professionalTax,
        lopDays: breakdown.lop.lopDays,
        workingDays: workingDaysInMonth,
        deductions: breakdown.deductions.total + breakdown.lop.lopDeduction,
        netPay: breakdown.netPay,
        breakdown: JSON.stringify(breakdown),
        status: "DRAFT",
      };

      let payrollRec;
      if (existingRecord) {
        payrollRec = await prisma.payrollRecord.update({
          where: { id: existingRecord.id },
          data: payrollData
        });
      } else {
        payrollRec = await prisma.payrollRecord.create({
          data: payrollData
        });
      }

      await writeAuditLog({
        orgId: session.user.orgId,
        userId: session.user.id,
        action: "RECALCULATE_PAYROLL",
        entity: "PayrollRecord",
        entityId: payrollRec.id,
        details: { year, month, netPay: payrollRec.netPay },
      });

      results.push(payrollRec);
    }

    return NextResponse.json({ message: "Recalculated successfully", count: results.length });
  } catch (error) {
    console.error("[Recalculate Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
