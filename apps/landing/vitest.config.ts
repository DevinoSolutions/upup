import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Node-environment unit tests for the support route + analytics/validation
// helpers. The `@` alias mirrors tsconfig's paths so tests import app modules
// the same way app code does.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
})
