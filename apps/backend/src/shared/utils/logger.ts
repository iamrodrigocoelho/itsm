import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
  redact: {
    paths: [
      'req.headers.authorization',
      'body.password',
      'body.currentPassword',
      'body.newPassword',
      '*.client_secret',
      '*.CASI_CLIENT_SECRET',
    ],
    censor: '[REDACTED]',
  },
});
