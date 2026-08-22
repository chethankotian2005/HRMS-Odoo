import prisma from "@/lib/prisma";

/**
 * Get the current leave balance for an employee for a specific leave type and year.
 * Balance = sum of all ledger entries (positive credits - negative debits).
 */
export async function getLeaveBalance(
  employeeId: string,
  leaveTypeId: string,
  year: number
): Promise<number> {
  const result = await prisma.leaveBalanceLedger.aggregate({
    where: { employeeId, leaveTypeId, year },
    _sum: { delta: true },
  });
  return result._sum.delta ?? 0;
}

/**
 * Get all leave balances for an employee for the given year, keyed by leaveTypeId.
 */
export async function getAllLeaveBalances(
  employeeId: string,
  orgId: string,
  year: number
): Promise<Record<string, number>> {
  const ledgers = await prisma.leaveBalanceLedger.groupBy({
    by: ["leaveTypeId"],
    where: { employeeId, orgId, year },
    _sum: { delta: true },
  });

  return Object.fromEntries(
    ledgers.map((l) => [l.leaveTypeId, l._sum.delta ?? 0])
  );
}

/**
 * Credit the annual grant to an employee for a leave type.
 * Idempotent - skips if an ANNUAL_GRANT entry already exists for this year.
 */
export async function grantAnnualLeave(
  orgId: string,
  employeeId: string,
  leaveTypeId: string,
  year: number,
  days: number,
  tx?: typeof prisma
): Promise<void> {
  const client = tx ?? prisma;
  const existing = await (client as typeof prisma).leaveBalanceLedger.findFirst({
    where: { orgId, employeeId, leaveTypeId, year, reason: "ANNUAL_GRANT" },
  });
  if (existing) return;

  await (client as typeof prisma).leaveBalanceLedger.create({
    data: { orgId, employeeId, leaveTypeId, year, delta: days, reason: "ANNUAL_GRANT" },
  });
}

/**
 * Debit leave balance when a request is approved.
 */
export async function debitLeave(
  orgId: string,
  employeeId: string,
  leaveTypeId: string,
  year: number,
  days: number,
  leaveRequestId: string,
  tx?: typeof prisma
): Promise<void> {
  const client = tx ?? prisma;
  await (client as typeof prisma).leaveBalanceLedger.create({
    data: {
      orgId,
      employeeId,
      leaveTypeId,
      year,
      delta: -days,
      reason: "APPROVED",
      leaveRequestId,
    },
  });
}

/**
 * Reverse a debit when a leave is rejected or cancelled after approval.
 */
export async function reverseLeaveDebit(
  orgId: string,
  employeeId: string,
  leaveTypeId: string,
  year: number,
  days: number,
  leaveRequestId: string,
  reason: "REJECTED_REVERSAL" | "CANCELLED_REVERSAL",
  tx?: typeof prisma
): Promise<void> {
  const client = tx ?? prisma;
  await (client as typeof prisma).leaveBalanceLedger.create({
    data: {
      orgId,
      employeeId,
      leaveTypeId,
      year,
      delta: days,
      reason,
      leaveRequestId,
    },
  });
}
