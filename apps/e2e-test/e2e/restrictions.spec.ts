import { test, expect } from '@playwright/test'

// All restriction tests use /?scenario=restrictions which configures:
//   accept="image/*"  maxFiles=2  maxFileSize=50KB  minFileSize=1KB

const VALID_IMAGE = {
    name: 'photo.png',
    mimeType: 'image/png',
    // 2KB — within 1KB–50KB window
    buffer: Buffer.alloc(2 * 1024, 0x89),
}

test.describe('File type restriction', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/?scenario=restrictions')
    })

    test('rejects a non-image file', async ({ page }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', {
            name: 'document.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('not an image'),
        })
        await expect(page.locator('[data-testid="upup-file-item"]')).not.toBeVisible()
    })

    test('accepts an image file', async ({ page }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', VALID_IMAGE)
        await expect(page.locator('[data-testid="upup-file-item"]')).toBeVisible()
    })
})

test.describe('File size restriction', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/?scenario=restrictions')
    })

    test('rejects a file over the size limit (> 50 KB)', async ({ page }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', {
            name: 'large.png',
            mimeType: 'image/png',
            buffer: Buffer.alloc(60 * 1024, 0x89), // 60 KB
        })
        await expect(page.locator('[data-testid="upup-file-item"]')).not.toBeVisible()
    })

    test('rejects a file under the minimum size (< 1 KB)', async ({ page }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', {
            name: 'tiny.png',
            mimeType: 'image/png',
            buffer: Buffer.alloc(100, 0x89), // 100 bytes
        })
        await expect(page.locator('[data-testid="upup-file-item"]')).not.toBeVisible()
    })

    test('accepts a file within the size window', async ({ page }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', VALID_IMAGE)
        await expect(page.locator('[data-testid="upup-file-item"]')).toBeVisible()
    })
})

test.describe('File count restriction', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/?scenario=restrictions')
    })

    test('accepts files up to the limit', async ({ page }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', [
            { name: 'img1.png', mimeType: 'image/png', buffer: Buffer.alloc(2 * 1024, 0x89) },
            { name: 'img2.png', mimeType: 'image/png', buffer: Buffer.alloc(2 * 1024, 0x89) },
        ])
        await expect(page.locator('[data-testid="upup-file-item"]')).toHaveCount(2)
    })

    test('rejects a batch when more files are added than allowed', async ({ page }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', [
            { name: 'img1.png', mimeType: 'image/png', buffer: Buffer.alloc(2 * 1024, 0x89) },
            { name: 'img2.png', mimeType: 'image/png', buffer: Buffer.alloc(2 * 1024, 0x89) },
            { name: 'img3.png', mimeType: 'image/png', buffer: Buffer.alloc(2 * 1024, 0x89) },
        ])
        await expect(page.locator('[data-testid="upup-file-item"]')).toHaveCount(0)
    })
})
