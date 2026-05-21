import type { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { getRedis } from '../../shared/utils/redis.js';
import { ReportsService } from './reports.service.js';
import { dashboardQuerySchema } from './reports.schemas.js';
import { requireRole } from '../../shared/middleware/requireRole.js';
import { ValidationError } from '../../shared/errors/AppError.js';

const prisma = new PrismaClient();

export const reportsRoutes: FastifyPluginAsync = async (app) => {
  // GET /reports/dashboard
  app.get(
    '/dashboard',
    {
      preHandler: [requireRole('GESTOR', 'ANALISTA_TI', 'AUDITOR', 'ADMIN')],
      schema: {
        tags: ['Reports'],
        summary: 'Dashboard executivo — KPIs e gráficos',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req, reply) => {
      const parsed = dashboardQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError('Parâmetros inválidos', parsed.error.flatten());
      const service = new ReportsService(prisma, getRedis());
      return reply.send(
        await service.getDashboard(parsed.data, req.jwtUser.sub, req.jwtUser.role),
      );
    },
  );
};
