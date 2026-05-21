import type { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { TicketsService } from './tickets.service.js';
import {
  createTicketSchema,
  listTicketsSchema,
  cancelTicketSchema,
} from './tickets.schemas.js';
import { requireRole } from '../../shared/middleware/requireRole.js';
import { ValidationError } from '../../shared/errors/AppError.js';

const prisma = new PrismaClient();
const ticketsService = new TicketsService(prisma);

const ALL_ROLES = ['COLABORADOR', 'GESTOR', 'ANALISTA_TI', 'AUDITOR', 'ADMIN'] as const;

export const ticketsRoutes: FastifyPluginAsync = async (app) => {
  // POST /tickets
  app.post(
    '/',
    {
      preHandler: [requireRole('COLABORADOR', 'GESTOR', 'ANALISTA_TI', 'ADMIN')],
      schema: { tags: ['Tickets'], summary: 'Abrir chamado', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const parsed = createTicketSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Dados inválidos', parsed.error.flatten());
      const ticket = await ticketsService.create(parsed.data, req.jwtUser.sub, req.ip);
      return reply.status(201).send(ticket);
    },
  );

  // GET /tickets
  app.get(
    '/',
    {
      preHandler: [requireRole(...ALL_ROLES)],
      schema: { tags: ['Tickets'], summary: 'Listar chamados', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const parsed = listTicketsSchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError('Parâmetros inválidos', parsed.error.flatten());
      return reply.send(
        await ticketsService.list(parsed.data, req.jwtUser.sub, req.jwtUser.role),
      );
    },
  );

  // GET /tickets/:id
  app.get(
    '/:id',
    {
      preHandler: [requireRole(...ALL_ROLES)],
      schema: { tags: ['Tickets'], summary: 'Detalhe do chamado', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      return reply.send(
        await ticketsService.getById(id, req.jwtUser.sub, req.jwtUser.role),
      );
    },
  );

  // POST /tickets/:id/cancel
  app.post(
    '/:id/cancel',
    {
      preHandler: [requireRole('COLABORADOR', 'GESTOR', 'ANALISTA_TI', 'ADMIN')],
      schema: { tags: ['Tickets'], summary: 'Cancelar chamado', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = cancelTicketSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Dados inválidos', parsed.error.flatten());
      return reply.send(await ticketsService.cancel(id, parsed.data, req.jwtUser.sub, req.ip));
    },
  );
};
