import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: '../../coverage/vanilla',
      // measured 2026-07-04: statements 50.21% branches 40.09% functions 39.42% lines 51.01%
      thresholds: { statements: 47, branches: 37, functions: 36, lines: 48 },
    },
  },
})
