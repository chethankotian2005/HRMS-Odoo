import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { can } from "@/lib/rbac/policy";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user, "read", { type: "AttendanceRecord", orgId: session.user.orgId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "PENDING";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const skip = (page - 1) * limit;

  const where: any = {
    orgId: session.user.orgId,
    ...(status !== "ALL" && { status }),
  };

  try {
    const [total, requests] = await Promise.all([
      prisma.attendanceCorrection.count({ where }),
      prisma.attendanceCorrection.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: { firstName: true, lastName: true, department: { select: { name: true } } }
          }
        }
      })
    ]);

    return NextResponse.json({
      requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Error fetching corrections:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
