import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.employeeId) {
    return NextResponse.json({ error: "No employee profile linked to this account." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");

  const where: any = {
    employeeId: session.user.employeeId,
  };

  if (startDateStr && endDateStr) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    where.date = {
      gte: startDate,
      lte: endDate,
    };
  }

  try {
    const records = await prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ records });
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
