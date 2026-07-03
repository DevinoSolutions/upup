import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: '../../coverage/server',
      // measured 2026-07-03: statements 66.71% branches 68.1% functions 72.38% lines 67.89%
      thresholds: { statements: 63, branches: 65, functions: 69, lines: 64 },
    },
  },
})
