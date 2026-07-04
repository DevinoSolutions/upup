import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: '../../coverage/vue',
      // measured 2026-07-04: statements 40.76% branches 24.64% functions 24.56% lines 42.49%
      thresholds: { statements: 37, branches: 21, functions: 21, lines: 39 },
    },
  },
})
