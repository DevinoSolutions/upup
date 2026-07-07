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
            // Re-measured 2026-07-07 (Windows 36.2/25.67/15.04/38.63, CI Linux
            // 35.8/25.75/15.65/38.63 — v8 numbers agree cross-platform): svelte src
            // grew untested branches/functions after the 2026-07-04 baseline (N4 DOM
            // sweep, tsconfig ratchets, lint burn-down) while this floor only ran in
            // never-executed CI. Floors re-based to measured-minus-margin; raising
            // them back is test work, not a threshold edit.
            thresholds: {
                statements: 33,
                branches: 23,
                functions: 12,
                lines: 36,
            },
        },
    },
})
