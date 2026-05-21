import type { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { UsersService } from './users.service.js';
import {
  createUserSchema,
  updateUserSchema,
  setManagerSchema,
  listUsersSchema,
  importCsvSchema,
} from './users.schemas.js';
import { requireRole } from '../../shared/middleware/requireRole.js';
import { ValidationError } from '../../shared/errors/AppError.js';

const prisma = new PrismaClient();
const usersService = new UsersService(prisma);

const ADMIN = 'ADMIN';
const ADMIN_OR_ANALISTA = ['ADMIN', 'ANALISTA_TI'];

export const usersRoutes: FastifyPluginAsync = async (app) => {
  // GET /users
  app.get(
    '/',
    {
      preHandler: [requireRole(...ADMIN_OR_ANALISTA)],
      schema: { tags: ['Users'], summary: 'Listar usuários (paginado)', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const parsed = listUsersSchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError('Parâmetros inválidos', parsed.error.flatten());
      return reply.send(await usersService.list(parsed.data));
    },
  );

  // GET /users/import-jobs/:id
  app.get(
    '/import-jobs/:id',
    {
      preHandler: [requireRole(ADMIN)],
      schema: { tags: ['Users'], summary: 'Status do job de importação CSV', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      return reply.send(await usersService.getImportJob(id));
    },
  );

  // GET /users/:id
  app.get(
    '/:id',
    {
      preHandler: [requireRole(...ADMIN_OR_ANALISTA)],
      schema: { tags: ['Users'], summary: 'Detalhe do usuário', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      return reply.send(await usersService.getById(id));
    },
  );

  // POST /users
  app.post(
    '/',
    {
      preHandler: [requireRole(ADMIN)],
      schema: { tags: ['Users'], summary: 'Criar usuário', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Dados inválidos', parsed.error.flatten());
      const user = await usersService.create(parsed.data, req.jwtUser.sub, req.ip);
      return reply.status(201).send(user);
    },
  );

  // PATCH /users/:id
  app.patch(
    '/:id',
    {
      preHandler: [requireRole(ADMIN)],
      schema: { tags: ['Users'], summary: 'Atualizar usuário', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = updateUserSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Dados inválidos', parsed.error.flatten());
      return reply.send(await usersService.update(id, parsed.data, req.jwtUser.sub, req.ip));
    },
  );

  // DELETE /users/:id — soft-delete (set status = INATIVO)
  app.delete(
    '/:id',
    {
      preHandler: [requireRole(ADMIN)],
      schema: { tags: ['Users'], summary: 'Inativar usuário', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      await usersService.softDelete(id, req.jwtUser.sub, req.ip);
      return reply.status(204).send();
    },
  );

  // PATCH /users/:id/manager
  app.patch(
    '/:id/manager',
    {
      preHandler: [requireRole(ADMIN)],
      schema: { tags: ['Users'], summary: 'Definir gestor do usuário', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = setManagerSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Dados inválidos', parsed.error.flatten());
      return reply.send(await usersService.setManager(id, parsed.data.managerId, req.jwtUser.sub, req.ip));
    },
  );

  // DELETE /users/:id/manager
  app.delete(
    '/:id/manager',
    {
      preHandler: [requireRole(ADMIN)],
      schema: { tags: ['Users'], summary: 'Remover gestor do usuário', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      await usersService.removeManager(id, req.jwtUser.sub, req.ip);
      return reply.status(204).send();
    },
  );

  // POST /users/import-csv
  app.post(
    '/import-csv',
    {
      preHandler: [requireRole(ADMIN)],
      schema: { tags: ['Users'], summary: 'Importar usuários via CSV', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const parsed = importCsvSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Dados inválidos', parsed.error.flatten());
      const job = await usersService.importCsv(parsed.data, req.jwtUser.sub, req.ip);
      return reply.status(201).send(job);
    },
  );
};
