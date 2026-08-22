import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== 'ADMIN' && session.user.role !== 'HR') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { employeeId, basicSalary, hra, allowances, effectiveFrom } = body;

    if (!employeeId || !basicSalary || !effectiveFrom) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId, orgId: session.user.orgId },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const effectiveDate = new Date(effectiveFrom);

    const newStructure = await prisma.$transaction(async (tx) => {
      const structure = await tx.salaryStructure.create({
        data: {
          orgId: session.user.orgId,
          employeeId,
          basicSalary: Number(basicSalary),
          hra: Number(hra || 0),
          allowances: Number(allowances || 0),
          effectiveFrom: effectiveDate,
          createdById: session.user.id,
        },
      });

      await writeAuditLog({
        orgId: session.user.orgId,
        userId: session.user.id,
        action: "CREATE_SALARY_STRUCTURE",
        entity: "SalaryStructure",
        entityId: structure.id,
        details: { employeeId, basicSalary, hra, allowances, effectiveFrom },
      }, tx as any);

      return structure;
    });

    return NextResponse.json(newStructure);
  } catch (error) {
    console.error("[Salary Structure Create Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
