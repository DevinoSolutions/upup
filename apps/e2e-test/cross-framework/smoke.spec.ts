import { test, expect, type Page } from '@playwright/test'
import { byName, storyUrl } from './framework-matrix'

// 2 KB fixture — clears any minFileSize and is large enough to be a real upload.
// Plain text avoids the image pipeline (thumbnail/heic) so the smoke stays lean.
const FILE_2KB = Buffer.alloc(2 * 1024, 'x')

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

test.describe('cross-framework smoke', () => {
  test('mounts, registers a file, and uploads real bytes to MinIO', async ({
    page,
  }, testInfo) => {
    const fw = byName(testInfo.project.name)

    // Navigate straight to the storybook preview iframe (story renders top-level).
    await page.goto(storyUrl(fw.storyId))

    // 1. Mount — the shared root is visible.
    await expect(page.locator('[data-testid="upup-root"]')).toBeVisible({
      timeout: 30_000,
    })

    // Clean any prior crash-recovery state, then re-mount fresh.
    await clearCrashRecovery(page)
    await page.reload()
    await expect(page.locator('[data-testid="upup-root"]')).toBeVisible({
      timeout: 30_000,
    })

    // 2. Primary surface renders (holds for single- and multi-source configs).
    await expect(page.locator('[data-testid="upup-dropzone"]')).toBeVisible()

    // 3. File-add registers (binding-layer critical). The hidden input is present
    // at mount (SourceSelector renders while files.size === 0). If a wrapper ever
    // gates it behind the local source button, reveal it first.
    const fileInput = page.locator('[data-testid="upup-file-input"]')
    if ((await fileInput.count()) === 0) {
      const localSource = page.locator('[data-testid="upup-source-local"]')
      if (await localSource.count()) await localSource.first().click()
    }
    await fileInput.first().waitFor({ state: 'attached', timeout: 15_000 })

    // 4. Real upload -> success. Arm the network wait BEFORE the add triggers
    // autoUpload. The only PUT in the flow is the object upload to MinIO.
    const putOk = page.waitForResponse(
      (resp) => resp.request().method() === 'PUT' && resp.status() === 200,
      { timeout: 60_000 },
    )

    await fileInput.first().setInputFiles({
      name: `smoke-${fw.name}.txt`,
      mimeType: 'text/plain',
      buffer: FILE_2KB,
    })

    // File registered in the list (tolerant of double-processing: >= 1 item).
    await expect(
      page.locator('[data-testid="upup-file-item"]').first(),
    ).toBeVisible({ timeout: 15_000 })

    // Primary success signal: the real PUT to MinIO returned 200.
    await putOk

    // Secondary (soft) signal: root flips to the successful state where emitted.
    await expect
      .soft(page.locator('[data-testid="upup-root"]'))
      .toHaveAttribute('data-state', 'successful', { timeout: 15_000 })
  })
})
