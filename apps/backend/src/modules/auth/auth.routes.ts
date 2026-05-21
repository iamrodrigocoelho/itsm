import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../../shared/config/env.js';
import { AuthService } from './auth.service.js';
import { loginSchema, refreshSchema, changePasswordSchema } from './auth.schemas.js';
import { ValidationError, UnauthorizedError } from '../../shared/errors/AppError.js';
import { authenticate } from '../../shared/middleware/requireRole.js';

const prisma = new PrismaClient();
const authService = new AuthService(prisma);

// Rate limit override for login (stricter than global)
const LOGIN_RATE_LIMIT = {
  max: 5,
  timeWindow: '15 minutes',
  keyGenerator: (req: FastifyRequest) => {
    const body = req.body as Record<string, unknown> | null;
    const email = typeof body?.['email'] === 'string' ? body['email'] : 'unknown';
    return `ratelimit:login:${email}:${req.ip}`;
  },
  errorResponseBuilder: () => ({
    statusCode: 429,
    error: 'TOO_MANY_REQUESTS',
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  }),
};

function extractUserIdFromBearer(authHeader: string | undefined): string {
  if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
    return payload.sub;
  } catch {
    // Access token may be expired on logout; allow using decoded sub if refresh is valid
    const decoded = jwt.decode(token) as { sub?: string } | null;
    if (!decoded?.sub) throw new UnauthorizedError();
    return decoded.sub;
  }
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /auth/login
  app.post(
    '/login',
    {
      config: { rateLimit: LOGIN_RATE_LIMIT },
      schema: {
        tags: ['Auth'],
        summary: 'Autenticar usuário',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Dados inválidos', parsed.error.flatten());

      const result = await authService.login(parsed.data, req.ip);
      return reply.status(200).send(result);
    },
  );

  // POST /auth/refresh
  app.post(
    '/refresh',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Renovar tokens',
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: { type: 'string' } },
        },
      },
    },
    async (req, reply) => {
      const parsed = refreshSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Dados inválidos', parsed.error.flatten());

      const result = await authService.refresh(parsed.data);
      return reply.status(200).send(result);
    },
  );

  // POST /auth/logout
  app.post(
    '/logout',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Encerrar sessão',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: { type: 'string' } },
        },
      },
    },
    async (req, reply) => {
      const userId = extractUserIdFromBearer(req.headers['authorization']);
      const body = req.body as { refreshToken?: string };
      if (!body?.refreshToken) throw new ValidationError('refreshToken obrigatório');

      await authService.logout(userId, body.refreshToken, req.ip);
      return reply.status(204).send();
    },
  );

  // POST /auth/change-password
  app.post(
    '/change-password',
    {
      preHandler: [authenticate()],
      schema: {
        tags: ['Auth'],
        summary: 'Alterar senha',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req, reply) => {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Dados inválidos', parsed.error.flatten());

      await authService.changePassword(req.jwtUser.sub, parsed.data);
      return reply.status(204).send();
    },
  );

  // GET /auth/me
  app.get(
    '/me',
    {
      preHandler: [authenticate()],
      schema: {
        tags: ['Auth'],
        summary: 'Dados do usuário autenticado',
        security: [{ bearerAuth: [] }],
      },
    },
    async (req, reply) => {
      const user = await prisma.user.findUnique({ where: { id: req.jwtUser.sub } });
      if (!user || user.status === 'INATIVO') throw new UnauthorizedError('Usuário não encontrado');

      return reply.status(200).send({
        id: user.id,
        matricula: user.matricula,
        nome: user.nome,
        email: user.email,
        role: user.role,
        status: user.status,
        codDominio: user.codDominio,
        codEmpresa: user.codEmpresa,
        codLojaAtual: user.codLojaAtual,
        mustChangePassword: user.mustChangePassword,
      });
    },
  );
};
