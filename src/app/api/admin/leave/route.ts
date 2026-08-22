import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { checkLeaveConflicts } from "@/lib/leave/conflicts";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["HR", "ADMIN"].includes(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING";

  const requests = await prisma.leaveRequest.findMany({
    where: { orgId: session.user.orgId, status, deletedAt: null },
    include: {
      employee: {
        select: {
          id: true, firstName: true, lastName: true, email: true,
          department: { select: { name: true } },
        },
      },
      leaveType: { select: { id: true, name: true, daysAllowed: true } },
    },
    orderBy: { startDate: "asc" },
  });

  // Enrich each request with conflict warnings + remaining balance
  const enriched = await Promise.all(
    requests.map(async (r) => {
      const conflicts = status === "PENDING"
        ? await checkLeaveConflicts(session.user!.orgId, r.employeeId, r.startDate, r.endDate)
        : { hasConflict: false, warnings: [], minCapacityPercent: 100 };

      const balanceAgg = await prisma.leaveBalanceLedger.aggregate({
        where: {
          employeeId: r.employeeId,
          leaveTypeId: r.leaveTypeId,
          year: r.startDate.getFullYear(),
        },
        _sum: { delta: true },
      });

      return { ...r, conflicts, remainingBalance: balanceAgg._sum.delta ?? 0 };
    })
  );

  return NextResponse.json({ requests: enriched });
}