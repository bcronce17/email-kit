import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.mjs']
        }
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.mjs'],
          testTimeout: 10_000,
          hookTimeout: 10_000
        }
      }
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'html', 'lcov']
    }
  }
});
