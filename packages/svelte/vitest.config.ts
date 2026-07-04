import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    server: { deps: { inline: ['@testing-library/svelte'] } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: '../../coverage/svelte',
      // measured 2026-07-04: statements 37.17% branches 31.06% functions 24.44% lines 40%
      thresholds: { statements: 34, branches: 28, functions: 21, lines: 37 },
    },
  },
})
