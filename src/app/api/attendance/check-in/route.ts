import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { can } from "@/lib/rbac/policy";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.employeeId) {
    return NextResponse.json({ error: "No employee profile linked to this account." }, { status: 403 });
  }

  // RBAC: employee can create their own attendance record
  if (!can(session.user, "create", { type: "AttendanceRecord", ownerId: session.user.employeeId, orgId: session.user.orgId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Use the current date for the check-in date
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  try {
    const record = await prisma.attendanceRecord.create({
      data: {
        orgId: session.user.orgId,
        employeeId: session.user.employeeId,
        date: today,
        checkIn: now,
        status: "PRESENT", // Default status, evaluated on check-out
      }
    });

    return NextResponse.json({ message: "Checked in successfully", record }, { status: 201 });
  } catch (error: any) {
    // Unique constraint violation for employeeId and date
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Already checked in today." }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
