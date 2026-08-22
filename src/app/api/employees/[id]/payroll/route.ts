import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { can } from "@/lib/rbac/policy";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const hasAccess = can(session.user as any, 'read', { type: 'PayrollRecord', ownerId: id, orgId: session.user.orgId });
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const records = await prisma.payrollRecord.findMany({
    where: { employeeId: id, orgId: session.user.orgId },
    orderBy: { periodStart: 'desc' },
  });

  return NextResponse.json(records);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Enforce read-only at the API layer — an employee PATCH must 403
  if (session.user.role === 'EMPLOYEE') {
    return NextResponse.json({ error: "Forbidden: Employees cannot update payroll records." }, { status: 403 });
  }

  const { id } = await params;
  
  const hasAccess = can(session.user as any, 'update', { type: 'PayrollRecord', ownerId: id, orgId: session.user.orgId });
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    return NextResponse.json({ message: "Patch successful (stub)" });
  } catch(e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
