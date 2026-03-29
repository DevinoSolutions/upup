import { defineConfig, devices } from '@playwright/test'

const PLAYGROUND_PORT = process.env.PLAYGROUND_PORT || '3000'
const playgroundUrl = `http://localhost:${PLAYGROUND_PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: playgroundUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  timeout: 60_000,
  webServer: {
    command: `pnpm --filter @upup/playground run dev`,
    url: playgroundUrl,
    timeout: 120_000,
    reuseExistingServer: true,
    cwd: '../..',
  },
  projects: [
    {
      name: 'Chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
          ],
        },
        permissions: ['camera', 'microphone'],
      },
    },
  ],
})
