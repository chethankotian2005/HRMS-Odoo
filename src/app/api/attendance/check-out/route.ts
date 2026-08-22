import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.employeeId) {
    return NextResponse.json({ error: "No employee profile linked to this account." }, { status: 403 });
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // Find today's record
  const record = await prisma.attendanceRecord.findUnique({
    where: {
      employeeId_date: {
        employeeId: session.user.employeeId,
        date: today,
      }
    }
  });

  if (!record) {
    return NextResponse.json({ error: "No check-in record found for today." }, { status: 404 });
  }

  if (record.checkOut) {
    return NextResponse.json({ error: "Already checked out today." }, { status: 400 });
  }

  // Compute worked hours
  const checkIn = new Date(record.checkIn!);
  const checkOut = now;
  const workedHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

  // Classify status
  let status = "ABSENT";
  if (workedHours >= 8) {
    status = "PRESENT";
  } else if (workedHours >= 4) {
    status = "HALF_DAY";
  }

  const updated = await prisma.attendanceRecord.update({
    where: { id: record.id },
    data: {
      checkOut,
      status,
    }
  });

  return NextResponse.json({ message: "Checked out successfully", record: updated }, { status: 200 });
}
