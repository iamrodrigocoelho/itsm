import type { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { CatalogsService } from './catalogs.service.js';
import { listCatalogsSchema } from './catalogs.schemas.js';
import { requireRole } from '../../shared/middleware/requireRole.js';
import { ValidationError } from '../../shared/errors/AppError.js';

const prisma = new PrismaClient();
const catalogsService = new CatalogsService(prisma);

export const catalogsRoutes: FastifyPluginAsync = async (app) => {
  // GET /catalogs
  app.get(
    '/',
    {
      preHandler: [requireRole('COLABORADOR', 'GESTOR', 'ANALISTA_TI', 'AUDITOR', 'ADMIN')],
      schema: { tags: ['Catalogs'], summary: 'Listar catálogos de serviço', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const parsed = listCatalogsSchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError('Parâmetros inválidos', parsed.error.flatten());
      return reply.send(await catalogsService.list(parsed.data));
    },
  );

  // GET /catalogs/:slug
  app.get(
    '/:slug',
    {
      preHandler: [requireRole('COLABORADOR', 'GESTOR', 'ANALISTA_TI', 'AUDITOR', 'ADMIN')],
      schema: { tags: ['Catalogs'], summary: 'Detalhe do catálogo por slug', security: [{ bearerAuth: [] }] },
    },
    async (req, reply) => {
      const { slug } = req.params as { slug: string };
      return reply.send(await catalogsService.getBySlug(slug));
    },
  );
};
