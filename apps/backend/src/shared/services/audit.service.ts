import type { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export interface AuditLogInput {
  entityType: string;
  entityId: string;
  action: string;
  actorUserId?: string | null;
  actorIp?: string | null | undefined;
  beforeValue?: unknown;
  afterValue?: unknown;
  metadata?: unknown;
}

export class AuditService {
  constructor(private readonly prisma: PrismaClient) {}

  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          actorUserId: input.actorUserId ?? null,
          actorIp: input.actorIp ?? null,
          ...(input.beforeValue !== undefined ? { beforeValue: input.beforeValue as never } : {}),
          ...(input.afterValue !== undefined ? { afterValue: input.afterValue as never } : {}),
          ...(input.metadata !== undefined ? { metadata: input.metadata as never } : {}),
        },
      });
    } catch (err) {
      logger.error({ err, input }, 'AuditService.log failed');
    }
  }
}
