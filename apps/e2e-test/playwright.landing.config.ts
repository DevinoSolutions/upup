import { defineConfig } from '@playwright/test'

// Landing feedback + shared-PostHog ingestion suite. Boots the landing dev
// server on a DEDICATED e2e port (never the 53000 dev default) forced onto the
// `e2e` dataset, so its events target the shared test project and can be
// verified by the ingestion spec.
//
// Isolated from the default suites by its own testDir + config, so `pnpm run
// e2e` never runs it. Run (local / nightly):
//   dotenv -e local-dev/.env.posthog-e2e -- \
//     pnpm --filter @upupjs/e2e-test test:e2e:landing
//
// The `flows` project (support + thumbs) runs first; the serial `ingestion`
// project depends on it, so verification always runs LAST against landed data.

const LANDING_PORT = 53080
const MASTRA_PORT = 4144
const baseURL = `http://localhost:${LANDING_PORT}`

export default defineConfig({
    testDir: './landing',
    globalSetup: './landing/global-setup.ts',
    // Single worker + serial: the flows submit against one dataset and one
    // Mastra boot; deterministic order also keeps ingestion strictly last.
    fullyParallel: false,
    workers: 1,
    // Generous: the thumbs flow waits on a live model, and ingestion polls the
    // Query API for up to ~90s per assertion.
    timeout: 300_000,
    expect: { timeout: 20_000 },
    reporter: [['list']],
    use: {
        baseURL,
        trace: 'retain-on-failure',
    },
    projects: [
        // docs.spec.ts has no PostHog/dataset dependency — it runs standalone,
        // independent of the flows -> ingestion ordering below.
        {
            name: 'docs',
            testMatch: /docs\.spec\.ts$/,
        },
        {
            name: 'flows',
            testMatch: /(support-flow|thumbs-flow)\.spec\.ts$/,
        },
        {
            name: 'ingestion',
            testMatch: /ingestion-verification\.spec\.ts$/,
            dependencies: ['flows'],
        },
    ],
    // Playwright merges this over process.env, so the dotenv-loaded e2e creds
    // still reach the server; these overrides just pin the e2e dataset + the
    // Mastra base URL our thumbs flow boots.
    webServer: {
        command: `pnpm --filter @upupjs/landing exec next dev -p ${LANDING_PORT}`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
            POSTHOG_DATASET: 'e2e',
            NEXT_PUBLIC_POSTHOG_DATASET: 'e2e',
            NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST:
                process.env.NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_HOST ?? '',
            NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN:
                process.env
                    .NEXT_PUBLIC_POSTHOG_E2E_TEST_PROJECT_CAPTURE_TOKEN ?? '',
            NEXT_PUBLIC_MASTRA_BASE_URL: `http://localhost:${MASTRA_PORT}`,
        },
    },
})
