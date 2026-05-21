import type { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ApprovalsService } from './approvals.service.js';
import { ReprocessService } from '../integrations/casi/casi.reprocess.service.js';
import { approveTicketSchema, rejectTicketSchema } from './approvals.schemas.js';
import { requireRole } from '../../shared/middleware/requireRole.js';
import { ValidationError } from '../../shared/errors/AppError.js';

const prisma = new PrismaClient();
const approvalsService = new ApprovalsService(prisma);
const reprocessService = new ReprocessService(prisma);

export const approvalsRoutes: FastifyPluginAsync = async (app) => {
  // POST /tickets/:id/approve
  app.post(
    '/:id/approve',
    {
      preHandler: [requireRole('GESTOR', 'ADMIN')],
      schema: { tags: ['Tickets'], summary: 'Aprovar chamado', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = approveTicketSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Dados inválidos', parsed.error.flatten());
      return reply.send(
        await approvalsService.approve(id, parsed.data, req.jwtUser.sub, req.ip),
      );
    },
  );

  // POST /tickets/:id/reject
  app.post(
    '/:id/reject',
    {
      preHandler: [requireRole('GESTOR', 'ADMIN')],
      schema: { tags: ['Tickets'], summary: 'Rejeitar chamado', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = rejectTicketSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Dados inválidos', parsed.error.flatten());
      return reply.send(
        await approvalsService.reject(id, parsed.data, req.jwtUser.sub, req.ip),
      );
    },
  );

  // POST /tickets/:id/reprocess — apenas ANALISTA_TI e ADMIN
  app.post(
    '/:id/reprocess',
    {
      preHandler: [requireRole('ANALISTA_TI', 'ADMIN')],
      schema: { tags: ['Tickets'], summary: 'Reprocessar chamado com falha de integração', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      return reply.send(await reprocessService.reprocess(id, req.jwtUser.sub, req.ip));
    },
  );
};
