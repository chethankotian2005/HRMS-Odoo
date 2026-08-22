import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { can } from "@/lib/rbac/policy";
import prisma from "@/lib/prisma";
import { startOfDay, endOfDay, format } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  if (!can(session.user, "read", { type: "AttendanceRecord", orgId: session.user.orgId })) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  const departmentId = searchParams.get("departmentId");
  const status = searchParams.get("status");
  const isProxy = searchParams.get("isSuspectedProxy");

  const where: any = { orgId: session.user.orgId };

  if (dateStr) {
    const targetDate = new Date(dateStr);
    where.date = { gte: startOfDay(targetDate), lte: endOfDay(targetDate) };
  }

  if (departmentId) {
    where.employee = { departmentId };
  }

  if (status) {
    where.status = status;
  }

  if (isProxy === "true") {
    where.isSuspectedProxy = true;
  }

  try {
    const records = await prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: "asc" },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            department: { select: { name: true } }
          }
        }
      }
    });

    const csvRows = [
      ["Employee Name", "Email", "Department", "Date", "Check In", "Check Out", "Status", "Proxy Flagged"]
    ];

    for (const record of records) {
      csvRows.push([
        `"${record.employee.firstName} ${record.employee.lastName}"`,
        `"${record.employee.email}"`,
        `"${record.employee.department?.name || 'N/A'}"`,
        format(new Date(record.date), "yyyy-MM-dd"),
        record.checkIn ? format(new Date(record.checkIn), "HH:mm:ss") : "-",
        record.checkOut ? format(new Date(record.checkOut), "HH:mm:ss") : "-",
        record.status,
        record.isSuspectedProxy ? "Yes" : "No"
      ]);
    }

    const csvString = csvRows.map(row => row.join(",")).join("\n");

    return new NextResponse(csvString, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="attendance_export_${format(new Date(), "yyyyMMdd_HHmmss")}.csv"`
      }
    });
  } catch (error) {
    console.error("Error exporting attendance:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
