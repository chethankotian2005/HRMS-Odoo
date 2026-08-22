import prisma from "@/lib/prisma";
import { getWorkingDays } from "@/lib/holidays";

export interface ConflictWarning {
  date: string;
  capacityPercent: number;
  onLeave: {
    employeeId: string;
    name: string;
    leaveType: string;
  }[];
}

export interface ConflictResult {
  hasConflict: boolean;
  warnings: ConflictWarning[];
  minCapacityPercent: number;
}

/**
 * Leave conflict engine.
 * Given a pending leave request, returns department capacity drops per day
 * and a list of employees already on leave for those dates.
 *
 * Surface the result as a warning banner to the approver.
 */
export async function checkLeaveConflicts(
  orgId: string,
  employeeId: string,
  startDate: Date,
  endDate: Date
): Promise<ConflictResult> {
  // Find the department of the requesting employee
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { departmentId: true, firstName: true, lastName: true },
  });

  if (!employee?.departmentId) {
    return { hasConflict: false, warnings: [], minCapacityPercent: 100 };
  }

  const departmentId = employee.departmentId;

  // Count total employees in the department
  const totalInDept = await prisma.employee.count({
    where: { departmentId, orgId, deletedAt: null },
  });

  if (totalInDept === 0) {
    return { hasConflict: false, warnings: [], minCapacityPercent: 100 };
  }

  // Get all working days in the requested range
  const workingDays = getWorkingDays(startDate, endDate);

  if (workingDays.length === 0) {
    return { hasConflict: false, warnings: [], minCapacityPercent: 100 };
  }

  // Fetch all APPROVED leaves in this department overlapping the date range
  const overlappingLeaves = await prisma.leaveRequest.findMany({
    where: {
      orgId,
      status: "APPROVED",
      deletedAt: null,
      employee: { departmentId },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      // Exclude the requesting employee themselves
      NOT: { employeeId },
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
      leaveType: { select: { name: true } },
    },
  });

  const warnings: ConflictWarning[] = [];

  for (const dayStr of workingDays) {
    const dayDate = new Date(dayStr);

    const onLeaveToday = overlappingLeaves.filter((req) => {
      const s = new Date(req.startDate);
      const e = new Date(req.endDate);
      s.setHours(0, 0, 0, 0);
      e.setHours(0, 0, 0, 0);
      dayDate.setHours(0, 0, 0, 0);
      return s <= dayDate && dayDate <= e;
    });

    if (onLeaveToday.length > 0) {
      // +1 counts the requesting employee themselves
      const onLeaveCount = onLeaveToday.length + 1;
      const capacityPercent = Math.round(
        ((totalInDept - onLeaveCount) / totalInDept) * 100
      );
      warnings.push({
        date: dayStr,
        capacityPercent,
        onLeave: onLeaveToday.map((r) => ({
          employeeId: r.employee.id,
          name: `${r.employee.firstName} ${r.employee.lastName}`,
          leaveType: r.leaveType.name,
        })),
      });
    }
  }

  const minCapacityPercent =
    warnings.length > 0
      ? Math.min(...warnings.map((w) => w.capacityPercent))
      : 100;

  return {
    hasConflict: warnings.some((w) => w.capacityPercent < 50),
    warnings,
    minCapacityPercent,
  };
}
