import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@upup/core': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      '@upup/core/contracts': fileURLToPath(new URL('./src/contracts.ts', import.meta.url)),
      '@upup/core/i18n': fileURLToPath(new URL('./src/i18n/index.ts', import.meta.url)),
      '@upup/core/theme': fileURLToPath(new URL('./src/theme/index.ts', import.meta.url)),
      '@upup/core/strategies': fileURLToPath(new URL('./src/strategies/index.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/**/*.test.ts',
      'src/**/__tests__/**/*.test.ts',
    ],
  },
})
