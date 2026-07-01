// Phase 4a + 4b — cross-framework a11y (axe-core) + media-view overflow sweep.
// Runs against each framework's `<fw>-uploader--playground` story, whose defaults
// enable sources local/url/camera/microphone/screen (MSW-mocked upload — no real
// network). 4a RECORDS axe violations (the list/listitem ARIA contract is React-only
// until the 5-framework port, so this is report-only, attached per project). 4b
// HARD-ASSERTS the fixed-height SourceViewContainer (`upup-overflow-hidden`) does
// not clip its media views: scrollHeight <= clientHeight (+tolerance).
//
// Run (dedicated config boots all six storybooks; MSW so no MinIO/e2e server):
//   rtk proxy pnpm --filter e2e-test exec playwright test --config playwright.a11y-overflow.config.ts
import { test, expect, type Page, type Locator } from '@playwright/test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { byName, storyUrl } from './framework-matrix'

// ── axe-core source (injected via CDP evaluate, which bypasses page CSP) ──────
const require = createRequire(import.meta.url)
function loadAxeSource(): string {
  try {
    return readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
  } catch {
    // Fallback: scan the workspace pnpm store (axe-core is a transitive dep of
    // @storybook/addon-a11y; not a direct dep here, so require.resolve can miss).
    const pnpmDir = fileURLToPath(new URL('../../../node_modules/.pnpm', import.meta.url))
    const cands = readdirSync(pnpmDir).filter((d) => /^axe-core@4\./.test(d)).sort().reverse()
    for (const d of cands) {
      try {
        return readFileSync(join(pnpmDir, d, 'node_modules/axe-core/axe.min.js'), 'utf8')
      } catch { /* next */ }
    }
    throw new Error('axe-core not found (require.resolve + .pnpm scan both failed)')
  }
}
const AXE_SOURCE = loadAxeSource()

const PLAYGROUND = (fw: string) => storyUrl(`${fw}-uploader--playground`)
const OVERFLOW_TOL = 4 // px — subpixel/border tolerance

interface AxeViolation {
  id: string
  impact: string | null
  nodes: number
  help: string
}

async function runAxe(page: Page): Promise<AxeViolation[]> {
  await page.evaluate(AXE_SOURCE)
  const ok = await page.evaluate(() => typeof (window as unknown as { axe?: unknown }).axe !== 'undefined')
  if (!ok) throw new Error('axe-core failed to inject into the page')
  return page.evaluate(async () => {
    // Scope to the uploader so we do not audit storybook chrome.
    const root = document.querySelector('.upup-scope') || document.body
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (window as any).axe.run(root, { resultTypes: ['violations'] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return res.violations.map((v: any) => ({ id: v.id, impact: v.impact ?? null, nodes: v.nodes.length, help: v.help }))
  })
}

// Measure the fixed-height, overflow-hidden container. We key on the per-view
// `data-upup-slot` (present on the SourceViewContainer root for EVERY view) rather
// than `data-testid="upup-adapter-view"`: some views (e.g. UrlUploader) pass their
// own data-testid to SourceViewContainer, which spreads {...rest} last and thus
// OVERRIDES the default upup-adapter-view testid. The slot attribute is the stable
// handle to the same clipping box across all views.
async function measureOverflow(container: Locator) {
  return container.evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }))
}

test.describe('cross-framework a11y + overflow', () => {
  // 4a — record axe violations (report-only; the ARIA gap on non-React frameworks
  // is expected until the port). Attached to the report per project.
  test('4a: axe-core a11y scan (record violations)', async ({ page }, testInfo) => {
    const fw = byName(testInfo.project.name)
    await page.goto(PLAYGROUND(fw.name))
    await expect(page.locator('[data-testid="upup-root"]')).toBeVisible({ timeout: 30_000 })

    const violations = await runAxe(page)
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    const summary = violations.length
      ? violations.map((v) => `${v.id}[${v.impact}]x${v.nodes}`).join(', ')
      : '(none)'
    // eslint-disable-next-line no-console
    console.log(`[axe][${fw.name}] ${violations.length} violations; serious/critical=${serious.length} :: ${summary}`)
    await testInfo.attach(`axe-${fw.name}.json`, {
      body: JSON.stringify(violations, null, 2),
      contentType: 'application/json',
    })
    // Report-only: no hard fail here. Triage happens in the audit doc.
    expect(Array.isArray(violations)).toBe(true)
  })

  // 4b — media/adapter views must not clip inside the fixed-height, overflow-hidden
  // SourceViewContainer. Camera/microphone auto-start via fake media devices; screen
  // capture (getDisplayMedia) is not driveable headlessly, so its initial view state
  // is measured (live preview verified interactively in a prior session).
  const MEDIA_VIEWS = [
    { src: 'camera', slot: 'camera-uploader' },
    { src: 'microphone', slot: 'audio-uploader' },
    { src: 'screen', slot: 'screen-capture-uploader' },
    { src: 'url', slot: 'url-uploader' },
  ] as const

  for (const view of MEDIA_VIEWS) {
    test(`4b: ${view.src} adapter view does not clip (no overflow)`, async ({ page }, testInfo) => {
      const fw = byName(testInfo.project.name)
      await page.goto(PLAYGROUND(fw.name))
      await expect(page.locator('[data-testid="upup-root"]')).toBeVisible({ timeout: 30_000 })

      const sourceBtn = page.locator(`[data-testid="upup-source-${view.src}"]`)
      await expect(sourceBtn, `source button upup-source-${view.src} present`).toHaveCount(1)
      await sourceBtn.first().click()

      // The fixed-height clipping box for this view (slot attr = stable across views).
      const container = page.locator(`[data-upup-slot="${view.slot}"]`).first()
      await expect(container, `${view.src} adapter container (slot=${view.slot}) rendered`).toBeVisible({ timeout: 15_000 })
      // Let media autoplay / layout settle so the measurement reflects steady state.
      await page.waitForTimeout(500)

      const m = await measureOverflow(container)
      // eslint-disable-next-line no-console
      console.log(`[overflow][${fw.name}] ${view.src}: sh=${m.scrollHeight} ch=${m.clientHeight} sw=${m.scrollWidth} cw=${m.clientWidth}`)
      await testInfo.attach(`overflow-${fw.name}-${view.src}.json`, {
        body: JSON.stringify(m, null, 2),
        contentType: 'application/json',
      })

      expect(
        m.scrollHeight,
        `${fw.name}/${view.src}: vertical clip — content ${m.scrollHeight}px exceeds container ${m.clientHeight}px`,
      ).toBeLessThanOrEqual(m.clientHeight + OVERFLOW_TOL)
      expect(
        m.scrollWidth,
        `${fw.name}/${view.src}: horizontal clip — content ${m.scrollWidth}px exceeds container ${m.clientWidth}px`,
      ).toBeLessThanOrEqual(m.clientWidth + OVERFLOW_TOL)
    })
  }
})
