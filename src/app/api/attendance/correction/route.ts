import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { startOfDay } from "date-fns";

const correctionSchema = z.object({
  date: z.string(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  reason: z.string().min(5, "Reason must be at least 5 characters long"),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.employeeId) {
    return NextResponse.json({ error: "Unauthorized or missing employee profile" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = correctionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { date, checkIn, checkOut, reason } = parsed.data;
  const targetDate = startOfDay(new Date(date));

  try {
    // Find if there's an existing record to link to
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId: session.user.employeeId,
          date: targetDate,
        }
      }
    });

    const correction = await prisma.attendanceCorrection.create({
      data: {
        orgId: session.user.orgId,
        employeeId: session.user.employeeId,
        attendanceRecordId: existingRecord?.id || null,
        date: targetDate,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        reason,
        status: "PENDING",
      },
      include: { employee: { select: { firstName: true, lastName: true } } }
    });

    // Notify Admins/HR
    const hrAdmins = await prisma.user.findMany({
      where: { orgId: session.user.orgId, role: { in: ["HR", "ADMIN"] }, deletedAt: null },
      select: { id: true },
    });

    if (hrAdmins.length > 0) {
      await prisma.notification.createMany({
        data: hrAdmins.map((u) => ({
          orgId: session.user!.orgId,
          userId: u.id,
          type: "ATTENDANCE_CORRECTION_SUBMITTED",
          title: "New Attendance Correction Request",
          body: `${correction.employee.firstName} ${correction.employee.lastName} requested a correction for ${date.split('T')[0]}.`,
          entityId: correction.id,
        })),
      });
    }

    return NextResponse.json({ message: "Correction request submitted", correction }, { status: 201 });
  } catch (error) {
    console.error("Error submitting correction:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
