import { logger } from '../shared/utils/logger.js';
import { getRedis } from '../shared/utils/redis.js';
import { startEmailWorker } from '../modules/notifications/email.service.js';
import { startCasiWorker } from '../modules/integrations/casi/casi.worker.js';

const emailWorker = startEmailWorker();
const casiWorker = startCasiWorker();

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Worker process shutting down gracefully');
  await Promise.all([emailWorker.close(), casiWorker.close()]);
  await getRedis().quit();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
