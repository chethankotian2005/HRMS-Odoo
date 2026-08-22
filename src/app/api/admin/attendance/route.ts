import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { can } from "@/lib/rbac/policy";
import prisma from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin/HR check
  if (!can(session.user, "read", { type: "AttendanceRecord", orgId: session.user.orgId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const dateStr = searchParams.get("date");
  const departmentId = searchParams.get("departmentId");
  const status = searchParams.get("status");
  const isProxy = searchParams.get("isSuspectedProxy");

  const skip = (page - 1) * limit;

  const where: any = {
    orgId: session.user.orgId,
  };

  if (dateStr) {
    const targetDate = new Date(dateStr);
    where.date = {
      gte: startOfDay(targetDate),
      lte: endOfDay(targetDate),
    };
  }

  if (departmentId) {
    where.employee = {
      departmentId,
    };
  }

  if (status) {
    where.status = status;
  }

  if (isProxy === "true") {
    where.isSuspectedProxy = true;
  }

  try {
    const [total, records] = await Promise.all([
      prisma.attendanceRecord.count({ where }),
      prisma.attendanceRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              department: {
                select: { name: true }
              }
            }
          }
        }
      })
    ]);

    return NextResponse.json({
      records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Error fetching admin attendance:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
