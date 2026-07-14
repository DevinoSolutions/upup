import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: '../../coverage/next',
      // measured 2026-07-04: statements 79.45% branches 62.33% functions 100% lines 79.1%
      thresholds: { statements: 76, branches: 59, functions: 97, lines: 76 },
    },
  },
})
