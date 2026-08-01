import { test, expect } from '@playwright/test'
import { FILE_2KB, clearCrashRecovery } from './helpers'

// Filler-byte buffer with an image/png mimeType — same pattern as restrictions.spec.ts.
// Only the MIME type needs to read as image/* for the eager-canPreview gate that
// shows the "Click to preview" trigger; the bytes need not decode as a real PNG.
const IMAGE_2KB = {
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(2 * 1024, 0x89),
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
        // Redesign: a SINGLE file renders the FileHero (upup-file-hero), not the
        // multi-file card list (upup-file-item). Dual selector so the assertion
        // stays true if the file ever lands in either surface.
        await expect(
            page.locator(
                '[data-testid="upup-file-hero"], [data-testid="upup-file-item"]',
            ),
        ).toBeVisible()
        await expect(page.getByText('test.txt')).toBeVisible()
    })

    test('removes a file from the list', async ({ page }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', {
            name: 'test.txt',
            mimeType: 'text/plain',
            buffer: FILE_2KB,
        })
        // Single file → hero. Its remove button lives in the accessibility tree
        // and is always visible (top-right, not hover-revealed), so no hover.
        await expect(
            page.locator('[data-testid="upup-file-hero"]'),
        ).toBeVisible()
        await page.locator('[data-testid="upup-file-remove"]').click()
        // Deferred removal keeps the tile ~200ms in a leaving state before it
        // unmounts; the web-first assertion retries until it's gone.
        await expect(
            page.locator('[data-testid="upup-file-hero"]'),
        ).not.toBeVisible()
    })

    test('adds multiple files and shows all in the list', async ({ page }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', [
            { name: 'file-a.txt', mimeType: 'text/plain', buffer: FILE_2KB },
            { name: 'file-b.txt', mimeType: 'text/plain', buffer: FILE_2KB },
            { name: 'file-c.txt', mimeType: 'text/plain', buffer: FILE_2KB },
        ])
        await expect(
            page.locator('[data-testid="upup-file-item"]'),
        ).toHaveCount(3)
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
        await expect(
            page.locator(
                '[data-testid="upup-file-hero"], [data-testid="upup-file-item"]',
            ),
        ).toBeVisible()
        await expect(
            page.locator('[data-testid="upup-upload-btn"]'),
        ).toBeVisible()
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
            dt.items.add(
                new File([new Uint8Array(2048).fill(120)], 'dragged.txt', {
                    type: 'text/plain',
                }),
            )
            return dt
        })
        await page.dispatchEvent('[data-testid="upup-dropzone"]', 'dragenter', {
            dataTransfer,
        })
        await page.dispatchEvent('[data-testid="upup-dropzone"]', 'dragover', {
            dataTransfer,
        })
        await page.dispatchEvent('[data-testid="upup-dropzone"]', 'drop', {
            dataTransfer,
        })
        // Single dropped file → hero (see "adds a file" above).
        await expect(
            page.locator(
                '[data-testid="upup-file-hero"], [data-testid="upup-file-item"]',
            ),
        ).toBeVisible()
        await expect(page.getByText('dragged.txt')).toBeVisible()
    })

    test('shows dropzone highlight on dragenter', async ({ page }) => {
        const dataTransfer = await page.evaluateHandle(() => new DataTransfer())
        await page.dispatchEvent('[data-testid="upup-dropzone"]', 'dragenter', {
            dataTransfer,
        })
        await expect(
            page.locator('[data-testid="upup-dropzone"]'),
        ).toBeVisible()
    })
})

test.describe('Paste upload', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await clearCrashRecovery(page)
        await page.reload()
    })

    test('adds a file via paste event', async ({ page }) => {
        // Wait for React to wire the dropzone's onPaste handler before dispatching.
        // The drag-drop test gets this for free via page.dispatchEvent's auto-waiting;
        // this test dispatches via page.evaluate (no auto-wait), so without this the
        // paste can fire before the handler is active and silently no-op.
        await expect(
            page.locator('[data-testid="upup-dropzone"]'),
        ).toBeVisible()
        await page.evaluate(() => {
            // 2 KB to pass minFileSize=1KB
            const file = new File(
                [new Uint8Array(2048).fill(120)],
                'pasted.txt',
                { type: 'text/plain' },
            )
            const dt = new DataTransfer()
            dt.items.add(file)
            // Dispatch on the dropzone element so React's onPaste handler fires
            const dropzone = document.querySelector(
                '[data-testid="upup-dropzone"]',
            )
            dropzone?.dispatchEvent(
                new ClipboardEvent('paste', {
                    clipboardData: dt,
                    bubbles: true,
                }),
            )
        })
        // Single pasted file → hero (see "adds a file" above).
        await expect(
            page.locator(
                '[data-testid="upup-file-hero"], [data-testid="upup-file-item"]',
            ),
        ).toBeVisible()
    })
})

test.describe('File preview — Escape closes (F-605)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await clearCrashRecovery(page)
        await page.reload()
    })

    test('pressing Escape closes the open file preview', async ({ page }) => {
        // Redesign: a SINGLE file renders the FileHero, which has no
        // click-to-preview affordance — that lives on the multi-file grid tile
        // (FilePreview). Add two images so the grid renders and the
        // "Click to preview" trigger + preview dialog exist; the F-605 intent
        // (Escape closes the open preview) is otherwise unchanged.
        await page.setInputFiles('[data-testid="upup-file-input"]', [
            IMAGE_2KB,
            {
                name: 'photo-2.png',
                mimeType: 'image/png',
                buffer: Buffer.alloc(2 * 1024, 0x89),
            },
        ])
        await expect(
            page.locator('[data-testid="upup-file-item"]'),
        ).toHaveCount(2)

        // Open the first tile's preview (photo.png, insertion order).
        await page.getByText('Click to preview').first().click()
        // Assert on the dialog itself, not the [data-upup-slot="file-preview-portal"]
        // wrapper: that wrapper carries no layout CSS of its own (`.upup-scope` is a
        // pure Tailwind-scoping selector prefix, not a sizing class) and its only
        // child is `position:fixed` (taken out of flow), so the wrapper collapses to
        // a 0x0 box and Playwright's toBeVisible() reports it hidden even while the
        // dialog is genuinely on screen. The dialog role IS the fixed, sized element.
        const dialog = page.getByRole('dialog', { name: 'photo.png' })
        await expect(dialog).toBeVisible()

        await page.keyboard.press('Escape')
        await expect(dialog).not.toBeVisible()
    })
})
