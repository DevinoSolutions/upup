import { defineConfig } from '@playwright/test'
import { frameworkProjects, frameworkWebServers } from './cross-framework/playwright-shared'

// Dedicated config for the Phase 4a/4b a11y + overflow sweep. Unlike
// playwright.crossframework.config.ts it has NO globalSetup/teardown — the
// Playground story is MSW-mocked, so it needs neither MinIO nor the :53060
// harness (and won't tear them down if they're running). Boots the six
// storybooks (reuseExistingServer reuses any already up). Fake media devices
// let the camera/microphone views reach their live state for overflow checks.
export default defineConfig({
  testDir: './cross-framework',
  testMatch: '**/a11y-overflow.spec.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // Serial by default: this sweep holds all six storybook dev servers resident, and
  // launching multiple chromium workers on top of a busy desktop (many resident
  // Chrome/node processes) tips Windows into a hard process abort (exit 0xC0000409)
  // before any test runs. One worker is reliable here; raise it on a clean/CI host.
  workers: 1,
  reporter: [['list']],
  use: {
    headless: true,
    trace: 'on-first-retry',
    launchOptions: {
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
      ],
    },
  },
  projects: frameworkProjects(),
  webServer: frameworkWebServers(),
})
