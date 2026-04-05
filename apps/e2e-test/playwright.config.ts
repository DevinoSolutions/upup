import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3333',
    headless: true,
  },
  webServer: {
    command: 'npx vite --port 3333',
    port: 3333,
    reuseExistingServer: true,
  },
})
