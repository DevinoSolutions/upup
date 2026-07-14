import { defineConfig } from '@playwright/test'

const port = Number(process.env.PLAYGROUND_PORT ?? '53004')
const baseURL = `http://localhost:${port}`

export default defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    expect: {
        timeout: 15_000,
    },
    outputDir: '../../.tmp/playground-e2e-results',
    use: {
        baseURL,
        headless: true,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        viewport: { width: 1440, height: 1000 },
        permissions: ['camera', 'microphone'],
        launchOptions: {
            args: [
                '--use-fake-ui-for-media-stream',
                '--use-fake-device-for-media-stream',
                '--auto-select-desktop-capture-source=Entire screen',
            ],
        },
    },
    webServer: {
        command: 'pnpm run dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
            PLAYGROUND_PORT: String(port),
        },
    },
})
