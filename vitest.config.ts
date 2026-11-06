import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/**/*.spec.ts', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/shared/**/*.ts',
        'server/db/**/*.ts',
        'server/services/playbooks.ts',
        'server/routes/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/shared/index.ts', // Barrel re-export file
        'server/services/vision.ts', // Requires live external Google Gemini API credentials
        'server/services/paypal.ts', // Requires live external PayPal Sandbox API credentials
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        branches: 65,
        functions: 80,
      },
    },
  },
});