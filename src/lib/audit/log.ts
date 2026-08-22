import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export interface AuditLogOptions {
  orgId: string;
  actorId?: string;
  action: string;
  entity: string;
  entityId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  /** Extra structured context; takes precedence over before/after when supplied. */
  details?: Prisma.InputJsonValue;
  ipAddress?: string;
}

export async function logAudit({
  orgId,
  actorId,
  action,
  entity,
  entityId,
  before,
  after,
  details,
  ipAddress,
}: AuditLogOptions) {
  try {
    await prisma.auditLog.create({
      data: {
        orgId,
        userId: actorId,
        action,
        entity,
        entityId,
        details: details ?? ((before || after) ? { before, after } : undefined),
        ipAddress,
      },
    });
  } catch (error) {
    // In production, we should handle audit logging failures carefully
    // (e.g., using a fallback queue or logging to stderr)
    // We shouldn't necessarily crash the user's action if audit fails, but we must log it.
    console.error("[AuditLog Error] Failed to write audit log:", error);
  }
}
