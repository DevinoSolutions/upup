import { defineConfig } from '@playwright/test'

const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: isCI
    ? [
        ['line'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ]
    : [['list']],
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm run storybook:react',
      url: 'http://127.0.0.1:6007/index.json',
      reuseExistingServer: !isCI,
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm run storybook:vue',
      url: 'http://127.0.0.1:6008/index.json',
      reuseExistingServer: !isCI,
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm run storybook:vanilla',
      url: 'http://127.0.0.1:6009/index.json',
      reuseExistingServer: !isCI,
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm run storybook:next',
      url: 'http://127.0.0.1:6015/index.json',
      reuseExistingServer: !isCI,
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm run storybook:preact',
      url: 'http://127.0.0.1:6010/index.json',
      reuseExistingServer: !isCI,
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm run storybook:solid',
      url: 'http://127.0.0.1:6011/index.json',
      reuseExistingServer: !isCI,
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm run storybook:svelte',
      url: 'http://127.0.0.1:6012/index.json',
      reuseExistingServer: !isCI,
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm run storybook:qwik',
      url: 'http://127.0.0.1:6013/index.json',
      reuseExistingServer: !isCI,
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm --filter @upup/angular run storybook',
      url: 'http://127.0.0.1:6014/index.json',
      reuseExistingServer: !isCI,
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm --filter @upup/landing run dev',
      url: 'http://127.0.0.1:53000',
      reuseExistingServer: !isCI,
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
