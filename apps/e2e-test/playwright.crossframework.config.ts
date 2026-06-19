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
  // All six Storybook dev servers cold-start concurrently (each runs its own vite
  // dependency prebundle), contending for CPU on a laptop or CI runner. A single
  // warm start is fast, but six cold ones together can exceed three minutes, so the
  // per-server bind timeout is generous. Playwright only waits for the slowest, and
  // a warm `reuseExistingServer` start is instant — so this ceiling costs nothing
  // on the happy path; it only prevents a premature cold-start failure.
  webServer: FRAMEWORKS.map((fw) => ({
    command: `pnpm --filter @upup/storybook-${fw.name} storybook`,
    port: fw.port,
    reuseExistingServer: true,
    timeout: 420_000,
  })),
})
