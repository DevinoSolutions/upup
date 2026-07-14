// F-605 — Escape closes the file preview across all six frameworks. Before this
// fix, react/vue/svelte already bound their Escape handler to `window` (so it
// fires regardless of where DOM focus sits), but angular and vanilla bound
// `keydown` only on the dialog div — a listener the dialog never receives,
// because the modal opens from a click OUTSIDE the portal subtree and neither
// framework moves focus into it. This is the only structural (non-live) proof
// for vanilla, which has no story-level interaction unit harness.
//
// Reuses the exact upload path parity.spec.ts already proves works on every
// framework's parityStoryIds[variant] story (sources:['local'], PNG upload ->
// FilePreview's eager canPreview shows "Click to preview").
import { test, expect, type Page } from '@playwright/test'
import { byName, storyUrl, PARITY_VARIANTS } from './framework-matrix'

// 1x1 transparent PNG — same fixture bytes as parity.spec.ts/preact-island.spec.ts.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

async function clearCrashRecovery(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('upup-crash-recovery')
        req.onsuccess = () => resolve()
        req.onerror = () => resolve()
        req.onblocked = () => resolve()
      }),
  )
}

test.describe('cross-framework file preview — Escape closes (F-605)', () => {
  for (const variant of PARITY_VARIANTS) {
    test(`Escape closes the open preview (variant: ${variant})`, async ({ page }, testInfo) => {
      const fw = byName(testInfo.project.name)

      await page.goto(storyUrl(fw.parityStoryIds[variant]))
      await expect(page.locator('[data-testid="upup-root"]')).toBeVisible({ timeout: 30_000 })
      await clearCrashRecovery(page)
      await page.reload()
      await expect(page.locator('[data-testid="upup-root"]')).toBeVisible({ timeout: 30_000 })

      const fileInput = page.locator('[data-testid="upup-file-input"]')
      if ((await fileInput.count()) === 0) {
        const localSource = page.locator('[data-testid="upup-source-local"]')
        if (await localSource.count()) await localSource.first().click()
      }
      await fileInput.first().waitFor({ state: 'attached', timeout: 15_000 })
      await fileInput.first().setInputFiles({ name: 'escape.png', mimeType: 'image/png', buffer: PNG_1x1 })

      await expect(page.locator('[data-testid="upup-file-item"]').first()).toBeVisible({ timeout: 15_000 })

      // Open the preview via the "Click to preview" trigger (shared i18n key,
      // present in every framework's FilePreview).
      await page.getByText('Click to preview').first().click()
      // Assert on the dialog role, not the [data-upup-slot="file-preview-portal"]
      // wrapper: that wrapper carries no layout CSS of its own (`.upup-scope` is a
      // pure Tailwind-scoping prefix) and its only child is position:fixed (out of
      // flow), so the wrapper itself collapses to a 0x0 box — Playwright's
      // toBeVisible() would report it hidden even while the dialog is genuinely on
      // screen. The dialog role IS the fixed, sized element every framework renders
      // with aria-label={fileName}.
      const dialog = page.getByRole('dialog', { name: 'escape.png' })
      await expect(dialog).toBeVisible({ timeout: 15_000 })

      // Focus is deliberately left wherever the click landed — NOT moved into the
      // dialog — reproducing the exact real-world path that exposed the angular +
      // vanilla no-op (a dialog-scoped listener would never see this key).
      await page.keyboard.press('Escape')
      await expect(dialog).not.toBeVisible({ timeout: 15_000 })
    })
  }
})
