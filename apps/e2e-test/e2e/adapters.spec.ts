import { test, expect } from '@playwright/test'
import { FILE_2KB, clearCrashRecovery } from './helpers'

test.describe('Adapter switching', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await clearCrashRecovery(page)
        await page.reload()
    })

    test('Link adapter shows URL input', async ({ page }) => {
        await page.click('[data-testid="upup-source-url"]')
        await expect(page.getByPlaceholder('Enter file url')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Fetch' })).toBeVisible()
    })

    test('Camera adapter shows capture UI', async ({ page }) => {
        await page.click('[data-testid="upup-source-camera"]')
        await expect(
            page.locator('[data-upup-slot="camera-uploader"]'),
        ).toBeVisible()
    })

    test('Google Drive adapter shows auth prompt', async ({ page }) => {
        await page.click('[data-testid="upup-source-googleDrive"]')
        await expect(
            page.locator('[data-upup-slot="google-drive-uploader"]'),
        ).toBeVisible()
    })

    test('OneDrive adapter shows auth prompt', async ({ page }) => {
        await page.click('[data-testid="upup-source-oneDrive"]')
        await expect(
            page.locator('[data-upup-slot="one-drive-uploader"]'),
        ).toBeVisible()
    })

    test('Dropbox adapter shows auth prompt', async ({ page }) => {
        await page.click('[data-testid="upup-source-dropbox"]')
        await expect(
            page.locator('[data-upup-slot="dropbox-uploader"]'),
        ).toBeVisible()
    })

    test('Cancel button returns to main view', async ({ page }) => {
        await page.click('[data-testid="upup-source-url"]')
        await expect(page.getByPlaceholder('Enter file url')).toBeVisible()
        // Redesign: the source view returns via "Back" (overlayBack), not "Cancel".
        await page.getByRole('button', { name: 'Back' }).click()
        await expect(
            page.locator('[data-testid="upup-dropzone"]'),
        ).toBeVisible()
    })
})

test.describe('URL upload', () => {
    test('fetches a file from URL and adds it to the list', async ({
        page,
    }) => {
        // Mock the URL — response body must be ≥ 1 KB to pass minFileSize
        await page.route('https://example.com/sample.txt', route => {
            route.fulfill({
                status: 200,
                contentType: 'text/plain',
                body: 'x'.repeat(2048),
                headers: {
                    'content-disposition': 'attachment; filename="sample.txt"',
                },
            })
        })
        await page.goto('/')
        await page.click('[data-testid="upup-source-url"]')
        await page.fill(
            '[placeholder="Enter file url"]',
            'https://example.com/sample.txt',
        )
        await page.click('button:has-text("Fetch")')
        // A single fetched file renders the hero (redesign); dual selector.
        await expect(
            page.locator(
                '[data-testid="upup-file-hero"], [data-testid="upup-file-item"]',
            ),
        ).toBeVisible({ timeout: 5000 })
    })
})

test.describe('Multi-file (default limit = 10)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await clearCrashRecovery(page)
        await page.reload()
    })

    test('shows all files when several are added at once', async ({ page }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', [
            { name: 'alpha.txt', mimeType: 'text/plain', buffer: FILE_2KB },
            { name: 'beta.txt', mimeType: 'text/plain', buffer: FILE_2KB },
            { name: 'gamma.txt', mimeType: 'text/plain', buffer: FILE_2KB },
        ])
        await expect(
            page.locator('[data-testid="upup-file-item"]'),
        ).toHaveCount(3)
        await expect(page.getByText('alpha.txt')).toBeVisible()
        await expect(page.getByText('beta.txt')).toBeVisible()
        await expect(page.getByText('gamma.txt')).toBeVisible()
    })

    test('each file has its own remove button', async ({ page }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', [
            { name: 'one.txt', mimeType: 'text/plain', buffer: FILE_2KB },
            { name: 'two.txt', mimeType: 'text/plain', buffer: FILE_2KB },
        ])
        await expect(
            page.locator('[data-testid="upup-file-item"]'),
        ).toHaveCount(2)
        // Remove buttons are absolutely positioned — hover each preview to ensure they render
        await page.locator('[data-testid="upup-file-preview"]').first().hover()
        await expect(
            page.locator('[data-testid="upup-file-remove"]').first(),
        ).toBeVisible()
    })

    test('can remove one file while others remain', async ({ page }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', [
            { name: 'keep.txt', mimeType: 'text/plain', buffer: FILE_2KB },
            { name: 'remove.txt', mimeType: 'text/plain', buffer: FILE_2KB },
        ])
        await expect(
            page.locator('[data-testid="upup-file-item"]'),
        ).toHaveCount(2)
        await page.locator('[data-testid="upup-file-preview"]').first().hover()
        await page
            .locator('[data-testid="upup-file-remove"]')
            .first()
            .click({ force: true })
        // Removing one of two leaves a SINGLE file, which re-renders as the hero
        // (not a card-list item) — count the remaining file across both surfaces.
        await expect(
            page.locator(
                '[data-testid="upup-file-hero"], [data-testid="upup-file-item"]',
            ),
        ).toHaveCount(1)
    })
})
