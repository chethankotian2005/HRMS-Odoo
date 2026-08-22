import prisma from "@/lib/prisma";
import { countWorkingDays } from "@/lib/holidays";
import { getLeaveBalance } from "@/lib/leave/balance";

export interface LeaveValidationResult {
  valid: boolean;
  errors: string[];
  workingDays: number;
}

/**
 * Server-side validation for a leave request.
 * Checks: past dates, date range > 30 days, overlapping requests,
 * insufficient balance (for non-unpaid leave types).
 */
export async function validateLeaveRequest(params: {
  orgId: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  halfDay: boolean;
  existingRequestId?: string; // for edits
}): Promise<LeaveValidationResult> {
  const errors: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(params.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(params.endDate);
  end.setHours(0, 0, 0, 0);

  // 1. Past date check
  if (start < today) {
    errors.push("Leave start date cannot be in the past.");
  }

  // 2. End must be >= start
  if (end < start) {
    errors.push("End date must be on or after the start date.");
  }

  // 3. Max 30 calendar days
  const calendarDays = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  if (calendarDays > 30) {
    errors.push("Leave duration cannot exceed 30 calendar days.");
  }

  // 4. Count actual working days
  const workingDays = params.halfDay ? 0.5 : countWorkingDays(start, end);

  if (workingDays === 0 && !params.halfDay) {
    errors.push("The selected date range contains no working days (weekends/holidays only).");
  }

  // 5. Overlapping pending/approved request for same employee
  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      orgId: params.orgId,
      employeeId: params.employeeId,
      status: { in: ["PENDING", "APPROVED"] },
      deletedAt: null,
      ...(params.existingRequestId ? { NOT: { id: params.existingRequestId } } : {}),
      AND: [
        { startDate: { lte: end } },
        { endDate: { gte: start } },
      ],
    },
  });
  if (overlap) {
    errors.push(
      `You already have an overlapping ${overlap.status.toLowerCase()} leave request from ${overlap.startDate.toISOString().split("T")[0]} to ${overlap.endDate.toISOString().split("T")[0]}.`
    );
  }

  // 6. Check balance (skip for Unpaid leave — daysAllowed = 0 means unlimited)
  const leaveType = await prisma.leaveType.findUnique({
    where: { id: params.leaveTypeId },
    select: { daysAllowed: true, name: true },
  });

  if (leaveType && leaveType.daysAllowed > 0) {
    const year = start.getFullYear();
    const balance = await getLeaveBalance(params.employeeId, params.leaveTypeId, year);
    if (workingDays > balance) {
      errors.push(
        `Insufficient balance. You have ${balance} day(s) remaining for ${leaveType.name}, but this request requires ${workingDays} day(s).`
      );
    }
  }

  return { valid: errors.length === 0, errors, workingDays };
}
