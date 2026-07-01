import { test, expect, type Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { byName, storyUrl } from './framework-matrix'
import { normalizeElement, type NormalizedNode } from './parity-dom'
import { PARITY_FIXTURES, type ParityComponent } from './parity-fixtures'

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURE_PATH = join(HERE, 'parity-fixtures.json')

// 1x1 transparent PNG (drives the image FilePreview path).
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)
const PDF_BYTES = Buffer.from('%PDF-1.4\n%minimal\n', 'utf8')

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

async function normalize(page: Page, selector: string): Promise<NormalizedNode> {
  await page.locator(selector).first().waitFor({ state: 'attached', timeout: 15_000 })
  return page.$eval(selector, normalizeElement)
}

test.describe('cross-framework DOM + a11y parity', () => {
  test('renders the agreed contract on every framework', async ({ page }, testInfo) => {
    const fw = byName(testInfo.project.name)

    await page.goto(storyUrl(fw.parityStoryId))
    await expect(page.locator('[data-testid="upup-root"]')).toBeVisible({ timeout: 30_000 })
    await clearCrashRecovery(page)
    await page.reload()
    await expect(page.locator('[data-testid="upup-root"]')).toBeVisible({ timeout: 30_000 })

    // SourceSelector is present at mount (files.size === 0).
    const sourceSelector = await normalize(page, '[data-testid="upup-adapter-selector"]')

    // Add an image (→ FilePreview) and a PDF (→ FileItem + FileIcon).
    const fileInput = page.locator('[data-testid="upup-file-input"]')
    if ((await fileInput.count()) === 0) {
      const localSource = page.locator('[data-testid="upup-source-local"]')
      if (await localSource.count()) await localSource.first().click()
    }
    await fileInput.first().waitFor({ state: 'attached', timeout: 15_000 })
    await fileInput.first().setInputFiles([
      { name: 'parity.png', mimeType: 'image/png', buffer: PNG_1x1 },
      { name: 'parity.pdf', mimeType: 'application/pdf', buffer: PDF_BYTES },
    ])

    await expect(page.locator('[data-testid="upup-file-item"]').first()).toBeVisible({ timeout: 15_000 })

    const fileItem = await normalize(page, '[data-testid="upup-file-item"]')
    const filePreview = await normalize(page, '[data-testid="upup-file-preview"]')
    const fileIcon = await normalize(page, '[data-testid="upup-file-icon"]')

    const captured: Record<ParityComponent, NormalizedNode> = {
      sourceSelector,
      fileItem,
      filePreview,
      fileIcon,
    }

    // Capture mode (react only): seed/refresh the fixtures, then hand-edit to target.
    if (process.env.UPDATE_PARITY && fw.name === 'react') {
      writeFileSync(FIXTURE_PATH, JSON.stringify(captured, null, 2) + '\n')
      test.info().annotations.push({ type: 'parity', description: 'fixtures written' })
      return
    }

    // Soft assertions so a single run reports ALL four component mismatches at
    // once (the composite fileItem embeds the fileIcon + filePreview subtrees, so
    // a hard assert would mask the leaf results behind the first failure).
    //
    // Fix 4 (D1): the hidden file input is `upup-hidden` (display:none) + aria-hidden
    // + tabindex=-1 — invisible plumbing. React/Vue render it inside SourceSelector;
    // Svelte/Angular own it in the shell. The normalizer skips `upup-hidden` subtrees,
    // so this asserts the VISIBLE + a11y SourceSelector contract only. The input's DOM
    // location stays a per-framework implementation detail (no runtime-contract rewrite).
    expect.soft(captured.sourceSelector, 'SourceSelector parity').toEqual(PARITY_FIXTURES.sourceSelector)
    expect.soft(captured.fileItem, 'FileItem parity').toEqual(PARITY_FIXTURES.fileItem)
    expect.soft(captured.filePreview, 'FilePreview parity').toEqual(PARITY_FIXTURES.filePreview)
    expect.soft(captured.fileIcon, 'FileIcon parity').toEqual(PARITY_FIXTURES.fileIcon)
  })
})
