import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup-env.js'],
    fileParallelism: false,
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: [
        'src/swagger.json',
        'src/**/index.js',
        'src/config/logger.js',
        'src/server.js',
      ],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 30,
        branches: 25,
        functions: 20,
        lines: 35,
      },
    },
  },
});