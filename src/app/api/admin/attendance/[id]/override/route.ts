import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { can } from "@/lib/rbac/policy";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit/log";
import { z } from "zod";

const overrideSchema = z.object({
  status: z.enum(["PRESENT", "HALF_DAY", "ABSENT"]).optional(),
  isSuspectedProxy: z.boolean().optional(),
  reason: z.string().min(1, "Reason is required for manual override"),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin/HR check
  if (!can(session.user, "update", { type: "AttendanceRecord", orgId: session.user.orgId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const recordId = params.id;
  
  const existingRecord = await prisma.attendanceRecord.findUnique({
    where: { id: recordId }
  });

  if (!existingRecord || existingRecord.orgId !== session.user.orgId) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = overrideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { status, isSuspectedProxy, reason } = parsed.data;

  try {
    const dataToUpdate: any = {};
    if (status !== undefined) dataToUpdate.status = status;
    if (isSuspectedProxy !== undefined) dataToUpdate.isSuspectedProxy = isSuspectedProxy;

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.attendanceRecord.update({
      where: { id: recordId },
      data: dataToUpdate
    });

    await logAudit({
      orgId: session.user.orgId,
      actorId: session.user.id,
      action: "ATTENDANCE_OVERRIDE",
      entity: "AttendanceRecord",
      entityId: recordId,
      details: {
        reason,
        before: {
          status: existingRecord.status,
          isSuspectedProxy: existingRecord.isSuspectedProxy
        },
        after: dataToUpdate
      }
    });

    return NextResponse.json({ message: "Attendance record overridden successfully", record: updated }, { status: 200 });
  } catch (error) {
    console.error("Error overriding attendance:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
