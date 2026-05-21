import type { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireRole } from '../../shared/middleware/requireRole.js';
import { ValidationError } from '../../shared/errors/AppError.js';
import type { AuditLogDto, PaginatedResponseDto } from '@itsm/shared-types';

const prisma = new PrismaClient();

const listAuditSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
  actorUserId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const ALLOWED_ROLES = ['ANALISTA_TI', 'AUDITOR', 'ADMIN'];

export const auditRoutes: FastifyPluginAsync = async (app) => {
  // GET /audit-logs
  app.get(
    '/',
    {
      preHandler: [requireRole(...ALLOWED_ROLES)],
      schema: {
        tags: ['Audit'],
        summary: 'Listar logs de auditoria (paginado)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req, reply) => {
      const parsed = listAuditSchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError('Parâmetros inválidos', parsed.error.flatten());

      const { page, limit, entityType, entityId, action, actorUserId, from, to } = parsed.data;
      const skip = (page - 1) * limit;

      const where = {
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
        ...(action ? { action } : {}),
        ...(actorUserId ? { actorUserId } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      };

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { actor: { select: { nome: true } } },
        }),
        prisma.auditLog.count({ where }),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: AuditLogDto[] = logs.map((log: any) => ({
        id: log.id,
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        actorUserId: log.actorUserId,
        actorNome: log.actor?.nome ?? null,
        actorIp: log.actorIp,
        beforeValue: log.beforeValue,
        afterValue: log.afterValue,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
      }));

      const response: PaginatedResponseDto<AuditLogDto> = {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };

      return reply.send(response);
    },
  );
};
