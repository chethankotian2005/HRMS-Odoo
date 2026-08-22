import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

interface AuditParams {
  orgId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  details?: Prisma.InputJsonValue;
}

/**
 * Write an audit log entry. Call this inside the same Prisma transaction
 * when available, or standalone for non-transactional operations.
 */
export async function writeAuditLog(
  params: AuditParams,
  tx?: typeof prisma
): Promise<void> {
  const client = tx ?? prisma;
  await (client as typeof prisma).auditLog.create({
    data: {
      orgId: params.orgId,
      userId: params.userId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details ?? {},
    },
  });
}
