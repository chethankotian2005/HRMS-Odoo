import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logAudit } from "@/lib/audit/log";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leaveRequest = await prisma.leaveRequest.findFirst({
    where: {
      id: params.id,
      orgId: session.user.orgId,
      deletedAt: null,
      ...(session.user.role === "EMPLOYEE" ? { employeeId: session.user.employeeId ?? undefined } : {}),
    },
    include: {
      employee: { select: { firstName: true, lastName: true, email: true, department: { select: { name: true } } } },
      leaveType: true,
    },
  });

  if (!leaveRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ leaveRequest });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leaveRequest = await prisma.leaveRequest.findFirst({
    where: {
      id: params.id,
      orgId: session.user.orgId,
      employeeId: session.user.employeeId ?? undefined,
      status: "PENDING",
      deletedAt: null,
    },
  });

  if (!leaveRequest) return NextResponse.json({ error: "Not found or cannot be cancelled." }, { status: 404 });

  await prisma.leaveRequest.update({ where: { id: params.id }, data: { status: "CANCELLED" } });

  await logAudit({
    orgId: session.user.orgId,
    actorId: session.user.id,
    action: "LEAVE_CANCELLED",
    entity: "LeaveRequest",
    entityId: params.id,
    before: { status: "PENDING" },
    after: { status: "CANCELLED" },
  });

  return NextResponse.json({ message: "Leave request cancelled." });
}