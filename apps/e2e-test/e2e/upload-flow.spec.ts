import { test, expect } from '@playwright/test'

// 2 KB — passes minFileSize=1KB in the test app
const TXT_FILE = {
    name: 'test.txt',
    mimeType: 'text/plain',
    buffer: Buffer.alloc(2 * 1024, 'x'),
}

// Full PresignedUrlResponse shape the SDK expects.
// Use same-origin URL so the XHR PUT has no CORS preflight.
const PRESIGNED_RESPONSE = {
    uploadUrl: 'http://localhost:3333/api/mock-upload',
    key: 'test/test.txt',
    publicUrl: 'http://localhost:3333/api/mock-upload/test.txt',
    expiresIn: 3600,
}

async function clearCrashRecovery(page: import('@playwright/test').Page) {
    await page.evaluate(() =>
        new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase('upup-crash-recovery')
            req.onsuccess = () => resolve()
            req.onerror = () => resolve()
            req.onblocked = () => resolve()
        }),
    )
}

test.describe('Upload flow — success', () => {
    test.beforeEach(async ({ page }) => {
        // Mock presign/token endpoint — routes survive page.reload()
        await page.route(/\/api\/upload/, (route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(PRESIGNED_RESPONSE),
            })
        })
        // Mock the PUT upload — always succeeds
        await page.route('**/api/mock-upload**', (route) => {
            route.fulfill({ status: 200 })
        })
        await page.goto('/')
        await clearCrashRecovery(page)
        await page.reload()
    })

    test('root data-state starts as pending', async ({ page }) => {
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute('data-state', 'pending')
    })

    test('upload button triggers upload and reaches successful state', async ({ page }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', TXT_FILE)
        await page.locator('[data-testid="upup-upload-btn"]').click()
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute(
            'data-state',
            'successful',
            { timeout: 10000 },
        )
    })

    test('progress bar is visible during upload', async ({ page }) => {
        // Slow down the PUT to catch the progress bar mid-upload
        await page.route('**/api/mock-upload**', (route) => {
            setTimeout(() => route.fulfill({ status: 200 }), 2000)
        })
        await page.setInputFiles('[data-testid="upup-file-input"]', TXT_FILE)
        await page.locator('[data-testid="upup-upload-btn"]').click()
        // Wait for upload to start (data-state="ongoing") then verify progressbar
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute('data-state', 'ongoing', { timeout: 10000 })
        await expect(page.locator('[role="progressbar"]').first()).toBeVisible({ timeout: 3000 })
    })
})

test.describe('Upload flow — error', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await clearCrashRecovery(page)
        await page.reload()
    })

    test('shows failed data-state when server returns 500', async ({ page }) => {
        await page.route(/\/api\/upload/, (route) => {
            route.fulfill({ status: 500, body: 'Internal Server Error' })
        })
        await page.setInputFiles('[data-testid="upup-file-input"]', TXT_FILE)
        await page.locator('[data-testid="upup-upload-btn"]').click()
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute(
            'data-state',
            'failed',
            { timeout: 10000 },
        )
    })

    test('shows retry button after failed upload', async ({ page }) => {
        await page.route(/\/api\/upload/, (route) => {
            route.fulfill({ status: 500, body: 'Internal Server Error' })
        })
        await page.setInputFiles('[data-testid="upup-file-input"]', TXT_FILE)
        await page.locator('[data-testid="upup-upload-btn"]').click()
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute('data-state', 'failed', { timeout: 10000 })
        await expect(page.getByText(/retry/i)).toBeVisible()
    })
})
