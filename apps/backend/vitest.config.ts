import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/workers/**',
        'src/server.ts',
        'src/**/*.routes.ts',
        'src/**/*.schemas.ts',
        'src/shared/middleware/**',
        'src/shared/utils/redis.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    setupFiles: ['./tests/setup.ts'],
  },
});
