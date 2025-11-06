import { defineConfig, devices } from '@playwright/test'

// Use a dedicated Storybook port for E2E to avoid conflicts with local dev
const STORYBOOK_PORT = 6007
const storyUrl = `http://localhost:${STORYBOOK_PORT}`

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: storyUrl,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    timeout: 60_000,
    // Start Storybook before running tests; reuse if already running
    webServer: {
        // Launch Storybook directly with the desired port in CI-friendly mode
        command: `pnpm exec storybook dev -p ${STORYBOOK_PORT} --ci --no-open`,
        url: `http://localhost:${STORYBOOK_PORT}`,
        timeout: 120_000,
        reuseExistingServer: true,
    },
    projects: [
        {
            name: 'Chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
})
