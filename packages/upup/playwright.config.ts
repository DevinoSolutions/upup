import { defineConfig, devices } from '@playwright/test'

// Read Storybook port from environment (loaded from local-dev/.env.ports)
const STORYBOOK_PORT = process.env.STORYBOOK_PORT || '53050'
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
        // Launch Storybook using the package.json script
        command: `pnpm run storybook`,
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
