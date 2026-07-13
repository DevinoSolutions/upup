import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
// Point @upupjs/react to our PREACT-compiled dist (already has react→preact/compat applied by tsup)
const preactDist = resolve(__dirname, 'dist/index.js')

// NOTE: run tests via `pnpm test` (triggers pretest→tsup), not bare `vitest` —
// the suite resolves @upupjs/react to the COMPILED dist, which pretest rebuilds.
// The dist-exists guard lives in vitest.global-setup.ts (run time), NOT here:
// config-eval-time throws break tools that parse this config without a dist
// (knip on a cold clone — the CI knip gate).

export default defineConfig({
    resolve: {
        // Force all preact copies to resolve from one package root
        dedupe: ['preact'],
        alias: [
            // Map @upupjs/react to OUR preact-compiled dist instead of react source
            { find: '@upupjs/react', replacement: preactDist },
            // Render bridge (authored against the react API) under preact/compat in tests,
            // matching the tsup main-build alias. Does not affect the parity test, which
            // imports the library's pure-data constants subpath (a different specifier).
            { find: /^react$/, replacement: 'preact/compat' },
            { find: /^react-dom$/, replacement: 'preact/compat' },
            { find: /^react\/jsx-runtime$/, replacement: 'preact/jsx-runtime' },
            {
                find: /^react\/jsx-dev-runtime$/,
                replacement: 'preact/jsx-runtime',
            },
            { find: /^react-dom\/client$/, replacement: 'preact/compat' },
        ],
    },
    test: {
        environment: 'jsdom',
        globals: true,
        globalSetup: './vitest.global-setup.ts',
        include: ['src/**/*.spec.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json-summary', 'html'],
            reportsDirectory: '../../coverage/preact',
            // measured 2026-07-04: statements 19.33% branches 11.36% functions 23.14% lines 19.81%
            thresholds: {
                statements: 16,
                branches: 8,
                functions: 20,
                lines: 16,
            },
        },
    },
})
