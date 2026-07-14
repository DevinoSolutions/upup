import { test, expect } from '@playwright/test'
import { FILE_2KB, clearCrashRecovery } from './helpers'
import { captureProductStateScreenshot } from '../visual/product-state-screenshots'

// Visual layer (deep React suite): drives the uploader through its
// user-visible product states — theme mounts, source views, the full upload
// lifecycle, and restriction rejection — asserting each state's behavioral
// signal (data-state / data-theme / slot visibility) and then freezing the
// rendered panel as a stable PNG via captureProductStateScreenshot. The
// screenshots land in apps/e2e-test/screenshots/deep-react/ and are the
// future snapvisor.io diff input; the behavioral assertion proves the state
// was really reached, the pixels prove what it looked like. Kept as a
// dedicated spec so the behavior suites stay pure and the visual inventory
// is readable in one place.

const TXT_FILE = {
    name: 'test.txt',
    mimeType: 'text/plain',
    buffer: FILE_2KB,
}

// Full PresignedUrlResponse shape the SDK expects (same-origin PUT — no CORS
// preflight), mirroring upload-flow.spec.ts.
const PRESIGNED_RESPONSE = {
    uploadUrl: 'http://localhost:3333/api/mock-upload',
    key: 'test/test.txt',
    publicUrl: 'http://localhost:3333/api/mock-upload/test.txt',
    expiresIn: 3600,
}

const DEEP_REACT = { suite: 'deep-react' as const, framework: 'react' }

test.describe('Visual product states — themes and source views', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await clearCrashRecovery(page)
        await page.reload()
    })

    test('the dark-theme uploader mounts to its idle source-selector state, and the rendered panel is frozen', async ({
        page,
    }) => {
        const root = page.locator(
            '[data-theme="dark"] [data-testid="upup-root"]',
        )
        await expect(root).toBeVisible()
        await expect(root).toHaveAttribute('data-state', 'idle')
        await captureProductStateScreenshot(page, {
            ...DEEP_REACT,
            flow: 'uploader-themes',
            state: 'idle-dark',
        })
    })

    test('the uploader re-renders under the light theme when the Light Mode tab is selected, and the rendered panel is frozen', async ({
        page,
    }) => {
        await page.getByRole('button', { name: 'Light Mode' }).click()
        const root = page.locator(
            '[data-theme="light"] [data-testid="upup-root"]',
        )
        await expect(root).toBeVisible()
        await captureProductStateScreenshot(page, {
            ...DEEP_REACT,
            flow: 'uploader-themes',
            state: 'idle-light',
        })
    })

    test('the link source view renders its URL input when the Link source is selected, and the rendered panel is frozen', async ({
        page,
    }) => {
        await page.getByRole('button', { name: 'Link' }).click()
        await expect(page.getByPlaceholder('Enter file url')).toBeVisible()
        await captureProductStateScreenshot(page, {
            ...DEEP_REACT,
            flow: 'source-views',
            state: 'link-url-input',
        })
    })
})

test.describe('Visual product states — upload lifecycle', () => {
    test.beforeEach(async ({ page }) => {
        await page.route(/\/api\/upload/, route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(PRESIGNED_RESPONSE),
            })
        })
        await page.route('**/api/mock-upload**', route => {
            route.fulfill({ status: 200 })
        })
        await page.goto('/')
        await clearCrashRecovery(page)
        await page.reload()
    })

    test('a selected file renders in the file list before any upload starts, and the rendered panel is frozen', async ({
        page,
    }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', TXT_FILE)
        await expect(
            page.locator('[data-testid="upup-file-item"]').first(),
        ).toBeVisible()
        await captureProductStateScreenshot(page, {
            ...DEEP_REACT,
            flow: 'upload-lifecycle',
            state: 'file-selected',
        })
    })

    test('an in-flight upload reaches the uploading data-state, and the panel is frozen with the live progress bar masked', async ({
        page,
    }) => {
        // Slow the PUT (route latency shaping, not a test sleep) so the
        // uploading state is stably observable while we capture it.
        await page.route('**/api/mock-upload**', route => {
            setTimeout(() => route.fulfill({ status: 200 }), 2000)
        })
        await page.setInputFiles('[data-testid="upup-file-input"]', TXT_FILE)
        await page.locator('[data-testid="upup-upload-btn"]').click()
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute(
            'data-state',
            'uploading',
            { timeout: 10_000 },
        )
        await expect(page.locator('[role="progressbar"]').first()).toBeVisible({
            timeout: 3_000,
        })
        await captureProductStateScreenshot(page, {
            ...DEEP_REACT,
            flow: 'upload-lifecycle',
            state: 'uploading-progress-masked',
            // The bar's fill width is a race against the 2 s mock latency —
            // inherently nondeterministic pixels, so they are masked out.
            mask: [page.locator('[role="progressbar"]')],
        })
    })

    test('a completed upload reaches the successful data-state, and the rendered panel is frozen', async ({
        page,
    }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', TXT_FILE)
        await page.locator('[data-testid="upup-upload-btn"]').click()
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute(
            'data-state',
            'successful',
            { timeout: 10_000 },
        )
        await captureProductStateScreenshot(page, {
            ...DEEP_REACT,
            flow: 'upload-lifecycle',
            state: 'upload-successful',
        })
    })

    test('a server 500 drives the failed data-state with the upload-error slot visible, and the rendered panel is frozen', async ({
        page,
    }) => {
        await page.route(/\/api\/upload/, route => {
            route.fulfill({ status: 500, body: 'Internal Server Error' })
        })
        await page.setInputFiles('[data-testid="upup-file-input"]', TXT_FILE)
        await page.locator('[data-testid="upup-upload-btn"]').click()
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute(
            'data-state',
            'failed',
            { timeout: 10_000 },
        )
        await expect(
            page.locator('[data-testid="upup-upload-error"]'),
        ).toBeVisible()
        await captureProductStateScreenshot(page, {
            ...DEEP_REACT,
            flow: 'upload-lifecycle',
            state: 'upload-failed',
        })
    })
})

test.describe('Visual product states — restriction rejection', () => {
    test('an over-limit batch is rejected leaving the panel fileless (its current contract), and the rendered panel is frozen', async ({
        page,
    }) => {
        // /?scenario=restrictions: accept image/* maxFiles=2 50KB/1KB window.
        await page.goto('/?scenario=restrictions')
        await page.setInputFiles('[data-testid="upup-file-input"]', [
            {
                name: 'img1.png',
                mimeType: 'image/png',
                buffer: Buffer.alloc(2 * 1024, 0x89),
            },
            {
                name: 'img2.png',
                mimeType: 'image/png',
                buffer: Buffer.alloc(2 * 1024, 0x89),
            },
            {
                name: 'img3.png',
                mimeType: 'image/png',
                buffer: Buffer.alloc(2 * 1024, 0x89),
            },
        ])
        // Today a rejected batch adds nothing and shows no in-panel error —
        // freezing that contract means the day a rejection UI ships, the
        // visual diff (not a human's memory) is what flags the change.
        await expect(
            page.locator('[data-testid="upup-file-item"]'),
        ).toHaveCount(0)
        await captureProductStateScreenshot(page, {
            ...DEEP_REACT,
            flow: 'restrictions',
            state: 'batch-rejected-fileless-contract',
        })
    })
})
