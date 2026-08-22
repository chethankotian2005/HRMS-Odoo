import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { can } from "@/lib/rbac/policy";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit/log";
import { z } from "zod";
import { differenceInSeconds } from "date-fns";
import { toDateKey } from "@/lib/holidays";

const decisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user, "update", { type: "AttendanceRecord", orgId: session.user.orgId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { status } = parsed.data;
  const correctionId = id;

  try {
    const correction = await prisma.attendanceCorrection.findUnique({
      where: { id: correctionId }
    });

    if (!correction || correction.orgId !== session.user.orgId) {
      return NextResponse.json({ error: "Correction request not found" }, { status: 404 });
    }

    if (correction.status !== "PENDING") {
      return NextResponse.json({ error: "Request is already processed" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update the correction request
      await tx.attendanceCorrection.update({
        where: { id: correctionId },
        data: {
          status,
          approvedById: session.user!.id
        }
      });

      // 2. If approved, apply the changes to the AttendanceRecord
      if (status === "APPROVED") {
        let attendanceStatus = "PRESENT";
        if (correction.checkIn && correction.checkOut) {
          const hours = differenceInSeconds(correction.checkOut, correction.checkIn) / 3600;
          if (hours < 4) attendanceStatus = "ABSENT";
          else if (hours < 8) attendanceStatus = "HALF_DAY";
        }

        const upsertData = {
          orgId: correction.orgId,
          employeeId: correction.employeeId,
          date: correction.date,
          checkIn: correction.checkIn,
          checkOut: correction.checkOut,
          status: attendanceStatus,
        };

        const existingRecord = correction.attendanceRecordId 
          ? await tx.attendanceRecord.findUnique({ where: { id: correction.attendanceRecordId } })
          : await tx.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId: correction.employeeId, date: correction.date } } });

        if (existingRecord) {
          await tx.attendanceRecord.update({
            where: { id: existingRecord.id },
            data: {
              checkIn: correction.checkIn,
              checkOut: correction.checkOut,
              status: attendanceStatus
            }
          });
        } else {
          await tx.attendanceRecord.create({
            data: upsertData
          });
        }

        // 3. Write to AuditLog
        await tx.auditLog.create({
          data: {
            orgId: session.user!.orgId,
            userId: session.user!.id,
            action: "ATTENDANCE_CORRECTION_APPROVED",
            entity: "AttendanceRecord",
            entityId: existingRecord?.id || "NEW",
            details: {
              correctionId,
              appliedCheckIn: correction.checkIn,
              appliedCheckOut: correction.checkOut,
              reason: correction.reason
            }
          }
        });
      }
    });

    // Notify employee (outside transaction)
    const employeeUser = await prisma.user.findFirst({
      where: { employee: { id: correction.employeeId } },
      select: { id: true },
    });

    if (employeeUser) {
      await prisma.notification.create({
        data: {
          orgId: session.user.orgId,
          userId: employeeUser.id,
          type: "ATTENDANCE_CORRECTION_PROCESSED",
          title: `Attendance Correction ${status}`,
          body: `Your attendance correction request for ${toDateKey(correction.date)} has been ${status.toLowerCase()}.`,
          entityId: correction.id,
        },
      });
    }

    return NextResponse.json({ message: `Correction request ${status.toLowerCase()}` }, { status: 200 });
  } catch (error) {
    console.error("Error processing correction:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
