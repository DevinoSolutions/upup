import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import mdx from 'fumadocs-mdx/vite'
import * as MdxConfig from './source.config'

// Node-environment unit tests for the support route + analytics/validation
// helpers. The `@` alias mirrors tsconfig's paths so tests import app modules
// the same way app code does. The fumadocs-mdx vite plugin lets vitest's
// Vite-based transform resolve the `*.mdx?collection=docs` virtual imports
// that Next's turbopack/webpack loader normally handles for `.source/`.
export default defineConfig({
    plugins: [mdx(MdxConfig)],
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
})
