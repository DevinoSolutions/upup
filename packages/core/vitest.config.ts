import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    // ORDER CONSTRAINT: every '@upup/core/<subpath>' key must precede the
    // bare '@upup/core' key below. Vite matches alias keys in object order;
    // the bare key prefix-matches any subpath specifier, so listing it first
    // silently shadows all subpath aliases for real (non-type-only) runtime
    // imports. Do not alphabetize this object.
    alias: {
      '@upup/core/contracts': fileURLToPath(new URL('./src/contracts.ts', import.meta.url)),
      '@upup/core/internal': fileURLToPath(new URL('./src/internal.ts', import.meta.url)),
      '@upup/core/i18n': fileURLToPath(new URL('./src/i18n/index.ts', import.meta.url)),
      '@upup/core/theme': fileURLToPath(new URL('./src/theme/index.ts', import.meta.url)),
      '@upup/core/strategies': fileURLToPath(new URL('./src/strategies/index.ts', import.meta.url)),
      '@upup/core': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/**/*.test.ts',
      'src/**/__tests__/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: '../../coverage/core',
      // measured 2026-07-03: statements 76.79% branches 66.15% functions 75.23% lines 78.71%
      thresholds: { statements: 73, branches: 63, functions: 72, lines: 75 },
    },
  },
})
