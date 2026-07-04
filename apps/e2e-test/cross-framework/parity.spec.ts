import { test, expect, type Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { byName, storyUrl } from './framework-matrix'
import { normalizeElement, type NormalizedNode } from './parity-dom'
import { PARITY_FIXTURES, KNOWN_DIVERGENCES, type ParityComponent } from './parity-fixtures'

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

/**
 * Asserts `captured` against `PARITY_FIXTURES[component]` for a framework,
 * honoring KNOWN_DIVERGENCES: frameworks in `assertOnly` get the normal
 * equality check; the OTHERS get the inverse forcing check — if an excepted
 * framework's capture starts matching canon, that's the divergence healing,
 * and the check fails on purpose so the KNOWN_DIVERGENCES entry gets removed
 * instead of silently going stale.
 */
function assertComponentParity(
  component: ParityComponent,
  captured: NormalizedNode,
  fwName: string,
  label: string,
) {
  const divergence = KNOWN_DIVERGENCES[component]
  if (!divergence || divergence.assertOnly.includes(fwName)) {
    expect.soft(captured, label).toEqual(PARITY_FIXTURES[component])
    return
  }
  // Excepted framework: prove the documented divergence still holds. If this
  // ever passes (capture now equals canon), the fix landed -- remove the
  // KNOWN_DIVERGENCES entry for `component` instead of leaving it stale.
  expect
    .soft(captured, `${label} — divergence healed, remove the KNOWN_DIVERGENCES entry for ${component} (${divergence.reason})`)
    .not.toEqual(PARITY_FIXTURES[component])
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
    const fileList = await normalize(page, '[data-testid="upup-file-list"]')

    const captured: Record<ParityComponent, NormalizedNode> = {
      sourceSelector,
      fileItem,
      filePreview,
      fileIcon,
      fileList,
    }

    // Capture mode (react only): seed/refresh the fixtures, then hand-edit to target.
    if (process.env.UPDATE_PARITY && fw.name === 'react') {
      writeFileSync(FIXTURE_PATH, JSON.stringify(captured, null, 2) + '\n')
      test.info().annotations.push({ type: 'parity', description: 'fixtures written' })
      return
    }

    // Soft assertions so a single run reports ALL five component mismatches at
    // once (the composite fileItem embeds the fileIcon + filePreview subtrees, so
    // a hard assert would mask the leaf results behind the first failure).
    //
    // Fix 4 (D1): the hidden file input is `upup-hidden` (display:none) + aria-hidden
    // + tabindex=-1 — invisible plumbing. React/Vue render it inside SourceSelector;
    // Svelte/Angular own it in the shell. The normalizer skips `upup-hidden` subtrees,
    // so this asserts the VISIBLE + a11y SourceSelector contract only. The input's DOM
    // location stays a per-framework implementation detail (no runtime-contract rewrite).
    assertComponentParity('sourceSelector', captured.sourceSelector, fw.name, 'SourceSelector parity')
    assertComponentParity('fileItem', captured.fileItem, fw.name, 'FileItem parity')
    assertComponentParity('filePreview', captured.filePreview, fw.name, 'FilePreview parity')
    assertComponentParity('fileIcon', captured.fileIcon, fw.name, 'FileIcon parity')
    // fileList: react/preact hard-asserted; vue/svelte/vanilla/angular carry the
    // documented F-711/F-712 divergences (KNOWN_DIVERGENCES) -- inverse forcing
    // check keeps the exception from silently outliving the bugs it names.
    assertComponentParity('fileList', captured.fileList, fw.name, 'FileList parity')
  })
})
