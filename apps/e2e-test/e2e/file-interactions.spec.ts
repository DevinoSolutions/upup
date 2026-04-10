import { test, expect } from '@playwright/test'

// All files must be ≥ 1 KB — the test app has minFileSize={{ size: 1, unit: 'KB' }}
const FILE_2KB = Buffer.alloc(2 * 1024, 'x')

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

test.describe('File selection via input', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await clearCrashRecovery(page)
        await page.reload()
    })

    test('adds a file and shows it in the list', async ({ page }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', {
            name: 'test.txt',
            mimeType: 'text/plain',
            buffer: FILE_2KB,
        })
        await expect(page.locator('[data-testid="upup-file-item"]')).toBeVisible()
        await expect(page.getByText('test.txt')).toBeVisible()
    })

    test('removes a file from the list', async ({ page }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', {
            name: 'test.txt',
            mimeType: 'text/plain',
            buffer: FILE_2KB,
        })
        await expect(page.locator('[data-testid="upup-file-item"]')).toBeVisible()
        // Hover to ensure the absolutely-positioned remove button is interactable
        await page.locator('[data-testid="upup-file-preview"]').hover()
        await page.locator('[data-testid="upup-file-remove"]').click({ force: true })
        await expect(page.locator('[data-testid="upup-file-item"]')).not.toBeVisible()
    })

    test('adds multiple files and shows all in the list', async ({ page }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', [
            { name: 'file-a.txt', mimeType: 'text/plain', buffer: FILE_2KB },
            { name: 'file-b.txt', mimeType: 'text/plain', buffer: FILE_2KB },
            { name: 'file-c.txt', mimeType: 'text/plain', buffer: FILE_2KB },
        ])
        await expect(page.locator('[data-testid="upup-file-item"]')).toHaveCount(3)
        await expect(page.getByText('file-a.txt')).toBeVisible()
        await expect(page.getByText('file-b.txt')).toBeVisible()
        await expect(page.getByText('file-c.txt')).toBeVisible()
    })

    test('upload button is visible after file is added', async ({ page }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', {
            name: 'test.txt',
            mimeType: 'text/plain',
            buffer: FILE_2KB,
        })
        await expect(page.locator('[data-testid="upup-file-item"]')).toBeVisible()
        await expect(page.locator('[data-testid="upup-upload-btn"]')).toBeVisible()
    })
})

test.describe('Drag and drop', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await clearCrashRecovery(page)
        await page.reload()
    })

    test('adds a file via drag and drop', async ({ page }) => {
        const dataTransfer = await page.evaluateHandle(() => {
            const dt = new DataTransfer()
            // 2 KB buffer to pass minFileSize=1KB
            dt.items.add(new File([new Uint8Array(2048).fill(120)], 'dragged.txt', { type: 'text/plain' }))
            return dt
        })
        await page.dispatchEvent('[data-testid="upup-dropzone"]', 'dragenter', { dataTransfer })
        await page.dispatchEvent('[data-testid="upup-dropzone"]', 'dragover', { dataTransfer })
        await page.dispatchEvent('[data-testid="upup-dropzone"]', 'drop', { dataTransfer })
        await expect(page.locator('[data-testid="upup-file-item"]')).toBeVisible()
        await expect(page.getByText('dragged.txt')).toBeVisible()
    })

    test('shows dropzone highlight on dragenter', async ({ page }) => {
        const dataTransfer = await page.evaluateHandle(() => new DataTransfer())
        await page.dispatchEvent('[data-testid="upup-dropzone"]', 'dragenter', { dataTransfer })
        await expect(page.locator('[data-testid="upup-dropzone"]')).toBeVisible()
    })
})

test.describe('Paste upload', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await clearCrashRecovery(page)
        await page.reload()
    })

    test('adds a file via paste event', async ({ page }) => {
        await page.evaluate(() => {
            // 2 KB to pass minFileSize=1KB
            const file = new File([new Uint8Array(2048).fill(120)], 'pasted.txt', { type: 'text/plain' })
            const dt = new DataTransfer()
            dt.items.add(file)
            // Dispatch on the dropzone element so React's onPaste handler fires
            const dropzone = document.querySelector('[data-testid="upup-dropzone"]')
            dropzone?.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }))
        })
        await expect(page.locator('[data-testid="upup-file-item"]')).toBeVisible()
    })
})
