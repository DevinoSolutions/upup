import { test, expect } from '@playwright/test'
import { FILE_2KB, clearCrashRecovery } from './helpers'

const TXT_FILE = {
    name: 'test.txt',
    mimeType: 'text/plain',
    buffer: FILE_2KB,
}

// Full PresignedUrlResponse shape the SDK expects.
// Use same-origin URL so the XHR PUT has no CORS preflight.
const PRESIGNED_RESPONSE = {
    uploadUrl: 'http://localhost:3333/api/mock-upload',
    key: 'test/test.txt',
    publicUrl: 'http://localhost:3333/api/mock-upload/test.txt',
    expiresIn: 3600,
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

    test('root data-state starts as idle', async ({ page }) => {
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute('data-state', 'idle')
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
        // Wait for upload to start (data-state="uploading") then verify progressbar
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute('data-state', 'uploading', { timeout: 10000 })
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

    // P4/C11 — default upload-error slot. Not covered by the cross-framework
    // parity harness: ParityComponent ('sourceSelector'|'fileItem'|'filePreview'
    // |'fileIcon') never drives an upload into the FAILED footer, so there is
    // no fixture category for it and no parity regen captures this element.
    // This deep-suite test is the real behavioral proof instead (principle #2 —
    // no smoke-test theater; a real mocked-server failure, not a rendered-only
    // check).
    test('renders the default upload-error message on a real 500 failure', async ({ page }) => {
        await page.route(/\/api\/upload/, (route) => {
            route.fulfill({ status: 500, body: 'Internal Server Error' })
        })
        await page.setInputFiles('[data-testid="upup-file-input"]', TXT_FILE)
        await page.locator('[data-testid="upup-upload-btn"]').click()
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute('data-state', 'failed', { timeout: 10000 })
        const errorSlot = page.locator('[data-testid="upup-upload-error"]')
        await expect(errorSlot).toBeVisible()
        await expect(errorSlot).toHaveAttribute('data-upup-slot', 'upload-error')
        await expect(errorSlot).not.toBeEmpty()
    })
})
