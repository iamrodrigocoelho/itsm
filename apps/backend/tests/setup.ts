import { vi } from 'vitest';

// Provide required env vars for tests before env.ts validation runs
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/itsm_test';
process.env['REDIS_URL'] = 'redis://localhost:6379';
process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-that-is-at-least-32-chars-long';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-that-is-at-least-32-chars-long';

vi.mock('../src/shared/utils/redis.js', () => ({
  getRedis: vi.fn(() => ({
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(-1),
  })),
  closeRedis: vi.fn(),
}));
