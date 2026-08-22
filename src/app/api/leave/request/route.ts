import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { can } from "@/lib/rbac/policy";
import { logAudit } from "@/lib/audit/log";
import prisma from "@/lib/prisma";
import { validateLeaveRequest } from "@/lib/leave/validation";
import { z } from "zod";

const applySchema = z.object({
  leaveTypeId: z.string().min(1, "Leave type is required"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  halfDay: z.boolean().default(false),
  reason: z.string().max(500).optional(),
});

// GET: List current employee leave requests
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: any = { orgId: session.user.orgId, deletedAt: null };
  // Employees only see their own; HR/ADMIN see all
  if (session.user.role === "EMPLOYEE") {
    where.employeeId = session.user.employeeId;
  }
  if (status) where.status = status;

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: {
      employee: { select: { firstName: true, lastName: true, email: true } },
      leaveType: { select: { name: true, daysAllowed: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

// POST: Apply for leave
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.employeeId) {
    return NextResponse.json({ error: "No employee profile linked to this account." }, { status: 403 });
  }

  // RBAC: employee can create their own leave request
  if (!can(session.user, "create", { type: "LeaveRequest", ownerId: session.user.employeeId, orgId: session.user.orgId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { leaveTypeId, startDate, endDate, halfDay, reason } = parsed.data;
  const start = new Date(startDate);
  const end = new Date(endDate);

  const validation = await validateLeaveRequest({
    orgId: session.user.orgId,
    employeeId: session.user.employeeId,
    leaveTypeId,
    startDate: start,
    endDate: end,
    halfDay,
  });

  if (!validation.valid) {
    return NextResponse.json({ errors: { root: validation.errors } }, { status: 422 });
  }

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      orgId: session.user.orgId,
      employeeId: session.user.employeeId,
      leaveTypeId,
      startDate: start,
      endDate: end,
      halfDay,
      reason: reason ?? null,
      status: "PENDING",
    },
    include: { leaveType: true, employee: { select: { firstName: true, lastName: true } } },
  });

  await logAudit({
    orgId: session.user.orgId,
    actorId: session.user.id,
    action: "LEAVE_APPLIED",
    entity: "LeaveRequest",
    entityId: leaveRequest.id,
    after: { leaveTypeId, startDate, endDate, halfDay, workingDays: validation.workingDays },
  });

  // Notify HR/ADMIN
  const hrAdmins = await prisma.user.findMany({
    where: { orgId: session.user.orgId, role: { in: ["HR", "ADMIN"] }, deletedAt: null },
    select: { id: true },
  });
  if (hrAdmins.length > 0) {
    await prisma.notification.createMany({
      data: hrAdmins.map((u) => ({
        orgId: session.user!.orgId,
        userId: u.id,
        type: "LEAVE_SUBMITTED",
        title: "New Leave Request",
        body: `${leaveRequest.employee.firstName} ${leaveRequest.employee.lastName} applied for ${leaveRequest.leaveType.name} (${startDate} to ${endDate}).`,
        entityId: leaveRequest.id,
      })),
    });
  }

  return NextResponse.json({ message: "Leave request submitted successfully.", leaveRequest }, { status: 201 });
}