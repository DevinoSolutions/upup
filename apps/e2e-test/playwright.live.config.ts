import { defineConfig } from '@playwright/test'

// Read-only checks against the DEPLOYED site (useupup.com by default). There
// is no webServer: the point is to prove what real visitors get, including
// configuration that lives outside this repo (the OAuth apps' registered
// redirect URIs, CORS origins and user limits in each provider's console).
// Isolated by its own testDir, so neither `pnpm run e2e` nor the landing
// config ever runs it. Nightly runs it; locally:
//
//   pnpm --filter @useupup/e2e-test test:e2e:live
//   UPUP_LIVE_BASE_URL=https://dev.useupup.com pnpm --filter @useupup/e2e-test test:e2e:live
const baseURL = (
    process.env.UPUP_LIVE_BASE_URL || 'https://useupup.com'
).replace(/\/+$/, '')

export default defineConfig({
    testDir: './live',
    // Real third-party sign-in pages over the public internet.
    timeout: 90_000,
    expect: { timeout: 20_000 },
    // One worker keeps the load on the providers' sign-in pages to a trickle.
    workers: 1,
    fullyParallel: false,
    // The providers' pages are outside our control; one retry absorbs a slow
    // third-party response without hiding a deterministic misconfiguration.
    retries: 1,
    reporter: [['list']],
    use: {
        baseURL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
})
