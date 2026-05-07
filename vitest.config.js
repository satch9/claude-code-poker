import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    timeout: 10000,
    projects: [
      {
        // Existing node tests (poker engine, blind structure, etc.)
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'tests/**/*.test.js',
            'tests/**/*.test.ts',
          ],
          exclude: ['tests/ui/**'],
        },
      },
      {
        // UI component tests with jsdom
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['tests/ui/**/*.test.tsx', 'tests/ui/**/*.test.ts'],
          setupFiles: ['tests/ui/setup.ts'],
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@convex': path.resolve(__dirname, './convex'),
    }
  }
});