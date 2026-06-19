import { defineConfig } from '@playwright/test'
import { FRAMEWORKS } from './cross-framework/framework-matrix'

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
  projects: FRAMEWORKS.map((fw) => ({
    name: fw.name,
    use: { baseURL: `http://localhost:${fw.port}` },
  })),
  // One dev server per storybook. The port is baked into each package's own
  // `storybook` script; reuseExistingServer lets a local dev keep theirs running.
  webServer: FRAMEWORKS.map((fw) => ({
    command: `pnpm --filter @upup/storybook-${fw.name} storybook`,
    port: fw.port,
    reuseExistingServer: true,
    timeout: 180_000,
  })),
})
