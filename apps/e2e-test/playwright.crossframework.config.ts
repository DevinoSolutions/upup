import { defineConfig } from '@playwright/test'
import {
    frameworkProjects,
    frameworkWebServers,
} from './cross-framework/playwright-shared'

// Second Playwright config (the deep React suite keeps playwright.config.ts).
// testDir is ./cross-framework so the two suites never collect each other's specs.
export default defineConfig({
    testDir: './cross-framework',
    // Real network + six concurrent first-run storybook compiles -> generous.
    timeout: 90_000,
    expect: { timeout: 15_000 },
    globalSetup: './cross-framework/global-setup.ts',
    globalTeardown: './cross-framework/global-teardown.ts',
    // Bound concurrency so six real uploads don't thundering-herd MinIO on a laptop.
    workers: 3,
    reporter: [['list']],
    use: {
        headless: true,
        trace: 'on-first-retry',
    },
    projects: [
        // Renders each framework's story once so the six vite first-request
        // compiles happen under the warm-up budget, not inside a real test's 30s
        // visibility window (see warmup.setup.ts). Runs after webServer readiness.
        { name: 'warmup', testMatch: /warmup\.setup\.ts/ },
        ...frameworkProjects().map(p => ({ ...p, dependencies: ['warmup'] })),
    ],
    webServer: frameworkWebServers(),
})
