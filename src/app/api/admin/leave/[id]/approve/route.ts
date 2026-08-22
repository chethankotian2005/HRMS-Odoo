import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { countWorkingDays } from "@/lib/holidays";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["HR", "ADMIN"].includes(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const leaveRequest = await prisma.leaveRequest.findFirst({
    where: { id: params.id, orgId: session.user.orgId, status: "PENDING", deletedAt: null },
    include: { leaveType: true, employee: { select: { firstName: true, lastName: true } } },
  });
  if (!leaveRequest) return NextResponse.json({ error: "Leave request not found or not pending" }, { status: 404 });

  const workingDays = leaveRequest.halfDay
    ? 0.5
    : countWorkingDays(leaveRequest.startDate, leaveRequest.endDate);
  const year = leaveRequest.startDate.getFullYear();

  // Transactional: approve + ledger debit + attendance update + audit log
  await prisma.$transaction(async (tx) => {
    // 1. Mark approved
    await tx.leaveRequest.update({
      where: { id: params.id },
      data: { status: "APPROVED", approvedById: session.user!.id, approvedAt: new Date() },
    });

    // 2. Debit ledger (skip for unlimited/unpaid: daysAllowed === 0)
    if (leaveRequest.leaveType.daysAllowed > 0) {
      await tx.leaveBalanceLedger.create({
        data: {
          orgId: session.user!.orgId,
          employeeId: leaveRequest.employeeId,
          leaveTypeId: leaveRequest.leaveTypeId,
          year,
          delta: -workingDays,
          reason: "APPROVED",
          leaveRequestId: params.id,
        },
      });
    }

    // 3. Upsert attendance records for each working day in the range
    const current = new Date(leaveRequest.startDate);
    current.setHours(0, 0, 0, 0);
    const endDate = new Date(leaveRequest.endDate);
    endDate.setHours(0, 0, 0, 0);

    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        const dateOnly = new Date(current);
        // Now safe to use upsert — Member 2 added @@unique([employeeId, date])
        await tx.attendanceRecord.upsert({
          where: { employeeId_date: { employeeId: leaveRequest.employeeId, date: dateOnly } },
          update: { status: "LEAVE" },
          create: {
            orgId: session.user!.orgId,
            employeeId: leaveRequest.employeeId,
            date: dateOnly,
            status: "LEAVE",
          },
        });
      }
      current.setDate(current.getDate() + 1);
    }

    // 4. Audit log inside the transaction
    await tx.auditLog.create({
      data: {
        orgId: session.user!.orgId,
        userId: session.user!.id,
        action: "LEAVE_APPROVED",
        entity: "LeaveRequest",
        entityId: params.id,
        details: { workingDays, leaveTypeId: leaveRequest.leaveTypeId, year },
      },
    });
  });

  // 5. Notify the employee (outside transaction, non-critical)
  const employeeUser = await prisma.user.findFirst({
    where: { employee: { id: leaveRequest.employeeId } },
    select: { id: true },
  });
  if (employeeUser) {
    await prisma.notification.create({
      data: {
        orgId: session.user.orgId,
        userId: employeeUser.id,
        type: "LEAVE_APPROVED",
        title: "Leave Approved",
        body: `Your ${leaveRequest.leaveType.name} leave from ${leaveRequest.startDate.toISOString().split("T")[0]} to ${leaveRequest.endDate.toISOString().split("T")[0]} has been approved.`,
        entityId: params.id,
      },
    });
  }

  return NextResponse.json({ message: "Leave request approved." });
}