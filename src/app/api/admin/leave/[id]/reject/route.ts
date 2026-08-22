import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { z } from "zod";

const rejectSchema = z.object({
  rejectionReason: z.string().min(5, "Please provide a reason (at least 5 characters)."),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["HR", "ADMIN"].includes(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const leaveRequest = await prisma.leaveRequest.findFirst({
    where: { id: params.id, orgId: session.user.orgId, status: "PENDING", deletedAt: null },
    include: { leaveType: true },
  });
  if (!leaveRequest) return NextResponse.json({ error: "Leave request not found or not pending" }, { status: 404 });

  // Transactional: reject + audit log
  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: params.id },
      data: { status: "REJECTED", rejectionReason: parsed.data.rejectionReason, approvedById: session.user!.id, approvedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        orgId: session.user!.orgId,
        userId: session.user!.id,
        action: "LEAVE_REJECTED",
        entity: "LeaveRequest",
        entityId: params.id,
        details: { rejectionReason: parsed.data.rejectionReason },
      },
    });
  });

  // Notify employee
  const employeeUser = await prisma.user.findFirst({
    where: { employee: { id: leaveRequest.employeeId } },
    select: { id: true },
  });
  if (employeeUser) {
    await prisma.notification.create({
      data: {
        orgId: session.user.orgId,
        userId: employeeUser.id,
        type: "LEAVE_REJECTED",
        title: "Leave Rejected",
        body: `Your ${leaveRequest.leaveType.name} leave request was rejected. Reason: ${parsed.data.rejectionReason}`,
        entityId: params.id,
      },
    });
  }

  return NextResponse.json({ message: "Leave request rejected." });
}