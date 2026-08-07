import { test, expect } from '@playwright/test'

test.describe('UpupUploader rendering', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
    })

    test('renders with Dark Mode button active', async ({ page }) => {
        await expect(
            page.getByRole('button', { name: 'Dark Mode' }),
        ).toBeVisible()
        await expect(
            page.getByRole('button', { name: 'Light Mode' }),
        ).toBeVisible()
        await expect(
            page.getByRole('button', { name: 'Headless Hook' }),
        ).toBeVisible()
    })

    test('shows header text with file limit', async ({ page }) => {
        // Redesign: the idle limits caption surfaces the file-count limit as an
        // iconified "N files max" segment (filesMax i18n key) instead of the old
        // single addDocumentsHere sentence.
        await expect(page.getByText('99 files max')).toBeVisible()
    })

    test('renders all 8 source icons', async ({ page }) => {
        await expect(
            page.getByRole('button', { name: 'My Device' }),
        ).toBeVisible()
        await expect(
            page.getByRole('button', { name: 'Google Drive' }),
        ).toBeVisible()
        await expect(
            page.getByRole('button', { name: 'OneDrive' }),
        ).toBeVisible()
        await expect(
            page.getByRole('button', { name: 'Dropbox' }),
        ).toBeVisible()
        await expect(page.getByRole('button', { name: 'Link' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Camera' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Audio' })).toBeVisible()
        await expect(
            page.getByRole('button', { name: 'Screen Capture' }),
        ).toBeVisible()
    })

    test('shows drag and browse text', async ({ page }) => {
        // Redesign dropzone prompt: "Drop files here," + the browse-files button.
        await expect(page.getByText('Drop files here,')).toBeVisible()
        await expect(
            page.getByRole('button', { name: 'browse files' }),
        ).toBeVisible()
    })

    test('shows max file size', async ({ page }) => {
        // Redesign: per-file size limit renders as the "999 MB each" caption
        // segment (sizeEach i18n key).
        await expect(page.getByText('999 MB each')).toBeVisible()
    })

    test('shows branding footer', async ({ page }) => {
        await expect(page.getByText('Built by')).toBeVisible()
    })

    // The root / dropzone / browse-button testid checks that sat here are
    // owned by data-testid.spec.ts, which pins the whole contract-string set
    // (root, container, dropzone, browse-files, branding, and every source
    // tile) with toHaveCount(1).
})

test.describe('Theme switching', () => {
    test('switches to light mode', async ({ page }) => {
        await page.goto('/')
        await page.getByRole('button', { name: 'Light Mode' }).click()
        // In light mode, the card should have a white background
        const root = page.locator('[data-testid="upup-root"]')
        await expect(root).toBeVisible()
    })

    // The headless-mode switch is covered by data-testid.spec.ts's "Headless
    // hook demo" block, which asserts the same two strings plus Files/Progress
    // and the switch back to the full UI.
})

// The former "Adapter views" block (Link + Camera source views) is covered by
// adapters.spec.ts, which drives the same views via their data-testid source
// tiles and asserts the per-provider slots. Its one assertion with no home
// there — getByText('Capture') — was folded into that file's camera test. The
// "Back" control stays pinned by adapters.spec.ts clicking it and by
// keyboard-only-source-activation-and-file-removal.spec.ts.
