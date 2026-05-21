import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './shared/config/env.js';
import { logger } from './shared/utils/logger.js';
import { getRedis } from './shared/utils/redis.js';
import { AppError } from './shared/errors/AppError.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { catalogsRoutes } from './modules/catalogs/catalogs.routes.js';
import { ticketsRoutes } from './modules/tickets/tickets.routes.js';
import { approvalsRoutes } from './modules/approvals/approvals.routes.js';
import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV === 'development' ? logger : true,
    genReqId: () => crypto.randomUUID(),
    requestIdHeader: 'x-request-id',
    trustProxy: true,
  });

  // Decorate request with jwtUser placeholder (populated by requireRole/authenticate middleware)
  app.decorateRequest('jwtUser', null);

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // handled by NGINX in production
  });

  // CORS — internal network only
  await app.register(cors, {
    origin: env.APP_BASE_URL,
    credentials: true,
  });

  // Rate limiting (default: 100/min per authenticated user)
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    redis: getRedis(),
    keyGenerator: (req) => {
      const authHeader = req.headers['authorization'];
      if (authHeader) return `ratelimit:api:${authHeader.slice(-16)}`;
      return `ratelimit:ip:${req.ip}`;
    },
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: 'TOO_MANY_REQUESTS',
      message: `Limite de ${context.max} requisições por minuto atingido. Tente novamente em ${context.after}.`,
    }),
  });

  // OpenAPI / Swagger
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'ITSM Conexão Tech API',
        description: 'API do sistema de IT Service Management',
        version: '1.0.0',
      },
      tags: [
        { name: 'Auth', description: 'Autenticação e sessão' },
        { name: 'Users', description: 'Gestão de usuários' },
        { name: 'Tickets', description: 'Chamados' },
        { name: 'Catalogs', description: 'Catálogo de serviços' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/api-docs',
    uiConfig: { docExpansion: 'list' },
  });

  // Global error handler
  app.setErrorHandler((error: FastifyError | AppError, _req: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      });
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(422).send({
        statusCode: 422,
        error: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: error.validation,
      });
    }

    logger.error({ err: error }, 'Unhandled error');
    return reply.status(500).send({
      statusCode: 500,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno do servidor',
    });
  });

  // Health checks
  app.get('/health', { logLevel: 'warn' }, async (_req, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/ready', { logLevel: 'warn' }, async (_req, reply) => {
    try {
      await getRedis().ping();
      return reply.send({ status: 'ready', timestamp: new Date().toISOString() });
    } catch {
      return reply.status(503).send({ status: 'not_ready', reason: 'redis_unavailable' });
    }
  });

  // Metrics endpoint (Prometheus format — placeholder; full metrics in Sprint 7)
  app.get('/metrics', { logLevel: 'warn' }, async (_req, reply) => {
    return reply.type('text/plain').send('# ITSM metrics — full instrumentation in Sprint 7\n');
  });

  // Application routes
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(usersRoutes, { prefix: '/users' });
  await app.register(auditRoutes, { prefix: '/audit-logs' });
  await app.register(catalogsRoutes, { prefix: '/catalogs' });
  await app.register(ticketsRoutes, { prefix: '/tickets' });
  await app.register(approvalsRoutes, { prefix: '/tickets' });

  return app;
}

// Start server (not called when imported in tests)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Graceful shutdown initiated');
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await app.listen({ port: env.APP_PORT, host: '0.0.0.0' });
    logger.info({ port: env.APP_PORT }, 'Server started');
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}
