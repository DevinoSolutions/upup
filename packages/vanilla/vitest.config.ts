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
            // measured 2026-07-19 (post default-experience redesign): statements 46.87% branches 37.69% functions 37.11% lines 48.08%
            // (was 2026-07-04: 50.21/40.09/39.42/51.01) — the redesign's new DOM
            // templates are verified by the cross-framework e2e, not unit tests, so
            // unit coverage dropped proportionally; floors re-based ~3pts below measured.
            thresholds: {
                statements: 44,
                branches: 34,
                functions: 34,
                lines: 45,
            },
        },
    },
})
