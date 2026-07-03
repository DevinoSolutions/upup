import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: '../../coverage/react',
      // measured 2026-07-03: statements 64.86% branches 50.12% functions 50% lines 65.55%
      thresholds: { statements: 61, branches: 47, functions: 47, lines: 62 },
    },
  },
})
