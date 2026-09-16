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
        // Folded in from uploader-render.spec.ts: the slot being present does
        // not prove the capture control rendered inside it, and this is the
        // only assertion on that label anywhere in the suite.
        await expect(page.getByText('Capture')).toBeVisible()
    })

    // The slot alone was never enough, and asserting only that is how these
    // cases stayed green on `dev` for the wrong reason. `data-upup-slot` sits on
    // BOTH branches of every drive component — the auth fallback AND the browser
    // — so a spinner that could never resolve satisfied it exactly as well as a
    // sign-in screen did. Each case now asserts the thing it is named after:
    // the auth fallback's own slot, and the prompt inside it.
    //
    // No drive is configured in this app, so the sign-in screen is the only
    // correct answer for all four.
    const authPrompts = [
        ['googleDrive', 'google-drive-uploader', 'Google Drive'],
        ['oneDrive', 'one-drive-uploader', 'OneDrive'],
        ['dropbox', 'dropbox-uploader', 'Dropbox'],
        ['box', 'box-uploader', 'Box'],
    ] as const

    for (const [source, slot, provider] of authPrompts) {
        test(`${provider} adapter shows auth prompt`, async ({ page }) => {
            await page.click(`[data-testid="upup-source-${source}"]`)
            // The adapter mounted at all.
            await expect(
                page.locator(`[data-upup-slot="${slot}"]`),
            ).toBeVisible()
            // ...and it is the AUTH view, not the browser branch. The slot
            // attribute cannot tell them apart — each uploader passes its own
            // name down, overriding the fallback's default — so these two are
            // what separates them, and they are what a perpetual loader fails.
            await expect(
                page.getByRole('button', { name: `Sign in with ${provider}` }),
            ).toBeVisible()
            await expect(
                page.getByText(
                    `Authenticate with ${provider} to select files for upload`,
                ),
            ).toBeVisible()
        })
    }

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

    // The plain "several files land in the list" case is a structural twin of
    // file-interactions.spec.ts's "adds multiple files and shows all in the
    // list" (same input, same toHaveCount(3), same per-name assertions — only
    // the filenames differed). The two tests below stay because they are about
    // per-file REMOVAL, which that file does not cover for a multi-file list.
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
