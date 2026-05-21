import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_PORT: z.coerce.number().default(3000),
  APP_BASE_URL: z.string().url().default('http://localhost'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  DATABASE_URL: z.string().min(1),

  REDIS_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.coerce.number().default(3600),
  JWT_REFRESH_TTL: z.coerce.number().default(28800),

  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM: z.string().default(''),
  SMTP_TLS: z.string().transform((v) => v === 'true').default('true'),

  CASI_BASE_URL: z.string().default(''),
  CASI_TENANT_ID: z.string().default(''),
  CASI_CLIENT_ID: z.string().default(''),
  CASI_CLIENT_SECRET: z.string().default(''),
  CASI_SCOPE: z.string().default(''),
  CASI_AUTH_KEY_REST_API: z.string().default(''),
  CASI_SUBSCRIPTION_KEY: z.string().default(''),
  CASI_DEFAULT_COD_DOMINIO: z.coerce.number().default(1),

  SEED_ADMIN_EMAIL: z.string().email().default('admin@empresa.com.br'),
  SEED_ADMIN_PASSWORD: z.string().default('Admin@123456'),
  SEED_ADMIN_MATRICULA: z.string().default('000001'),
  SEED_ADMIN_NOME: z.string().default('Administrador do Sistema'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
