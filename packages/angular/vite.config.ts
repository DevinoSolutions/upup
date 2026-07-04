/// <reference types="vitest" />
import { defineConfig } from 'vite'
import angular from '@analogjs/vite-plugin-angular'

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    pool: 'threads',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: '../../coverage/angular',
      // measured 2026-07-04: statements 74.07% branches 56.35% functions 64.97% lines 74.05%
      thresholds: { statements: 71, branches: 53, functions: 61, lines: 71 },
    },
  },
})
