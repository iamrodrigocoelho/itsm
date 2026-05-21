import { logger } from '../shared/utils/logger.js';
import { getRedis } from '../shared/utils/redis.js';

// BullMQ workers will be registered here in Sprint 4
logger.info('Worker process starting (Sprint 4: CASI integration worker will be registered here)');

process.on('SIGTERM', async () => {
  logger.info('Worker shutting down gracefully');
  await getRedis().quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Worker shutting down gracefully');
  await getRedis().quit();
  process.exit(0);
});
