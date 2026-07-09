// Phase 4a + 4b — cross-framework a11y (axe-core) + media-view overflow sweep.
// Runs against each framework's `<fw>-uploader--playground` story, whose defaults
// enable sources local/url/camera/microphone/screen (MSW-mocked upload — no real
// network). 4a RECORDS axe violations (the list/listitem ARIA contract is React-only
// until the 5-framework port, so this is report-only, attached per project). 4b
// HARD-ASSERTS the fixed-height SourceViewContainer (`upup-overflow-hidden`) does
// not clip its media views: scrollHeight <= clientHeight (+tolerance).
//
// Run (dedicated config boots all six storybooks; MSW so no MinIO/e2e server):
//   rtk proxy pnpm --filter @upup/e2e-test exec playwright test --config playwright.a11y-overflow.config.ts
import { test, expect, type Page, type Locator } from '@playwright/test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { byName, storyUrl, PARITY_VARIANTS } from './framework-matrix'

// ── axe-core source (injected via CDP evaluate, which bypasses page CSP) ──────
const require = createRequire(import.meta.url)
function loadAxeSource(): string {
    try {
        return readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
    } catch {
        // Fallback: scan the workspace pnpm store (axe-core is a transitive dep of
        // @storybook/addon-a11y; not a direct dep here, so require.resolve can miss).
        const pnpmDir = fileURLToPath(
            new URL('../../../node_modules/.pnpm', import.meta.url),
        )
        const cands = readdirSync(pnpmDir)
            .filter(d => /^axe-core@4\./.test(d))
            .sort()
            .reverse()
        for (const d of cands) {
            try {
                return readFileSync(
                    join(pnpmDir, d, 'node_modules/axe-core/axe.min.js'),
                    'utf8',
                )
            } catch {
                /* next */
            }
        }
        throw new Error(
            'axe-core not found (require.resolve + .pnpm scan both failed)',
        )
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

// ── axe baseline (reviewed, per-framework serious/critical ceiling) ───────────
const HERE = dirname(fileURLToPath(import.meta.url))
const BASELINE_PATH = join(HERE, 'a11y-baseline.json')
type A11yBaseline = Record<string, { rule: string; count: number }[]>

function loadBaseline(): A11yBaseline {
    try {
        return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as A11yBaseline
    } catch {
        return {}
    }
}

async function runAxe(page: Page): Promise<AxeViolation[]> {
    await page.evaluate(AXE_SOURCE)
    const ok = await page.evaluate(
        () =>
            typeof (window as unknown as { axe?: unknown }).axe !== 'undefined',
    )
    if (!ok) throw new Error('axe-core failed to inject into the page')
    return page.evaluate(async () => {
        // Scope to the uploader so we do not audit storybook chrome.
        const root = document.querySelector('.upup-scope') || document.body
        // Storybook's addon-a11y auto-scans on story render; if that run still
        // holds axe's global lock, axe.run() hard-throws "Axe is already running"
        // instead of queueing — retry until the lock frees (bounded).
        const deadline = Date.now() + 15_000
        for (;;) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const res = await (window as any).axe.run(root, {
                    resultTypes: ['violations'],
                })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return res.violations.map((v: any) => ({
                    id: v.id,
                    impact: v.impact ?? null,
                    nodes: v.nodes.length,
                    help: v.help,
                }))
            } catch (err) {
                if (
                    !/already running/i.test(String(err)) ||
                    Date.now() > deadline
                )
                    throw err
                // sleep-allow(bounded backoff until axe's global lock frees — the lock holder emits no event to await)
                await new Promise(resolve => setTimeout(resolve, 250))
            }
        }
    })
}

// Measure the fixed-height, overflow-hidden container. We key on the per-view
// `data-upup-slot` (present on the SourceViewContainer root for EVERY view) rather
// than `data-testid="upup-source-view"`: some views (e.g. UrlUploader) pass their
// own data-testid to SourceViewContainer, which spreads {...rest} last and thus
// OVERRIDES the default upup-source-view testid. The slot attribute is the stable
// handle to the same clipping box across all views.
async function measureOverflow(container: Locator) {
    return container.evaluate(el => ({
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
    }))
}

test.describe('cross-framework a11y + overflow', () => {
    // 4a — ratchet axe serious/critical violations against a reviewed baseline
    // (a11y-baseline.json). New serious/critical (an unbaselined rule id, or a
    // baselined rule at a HIGHER count) fails the run -- fix it or re-baseline
    // deliberately (UPDATE_A11Y_BASELINE=1). Moderate/minor stay report-only
    // (console.warn + attachment) -- noisier/lower-confidence than axe's top
    // two tiers, so warning avoids flaky/opinionated failures while still
    // surfacing them for triage.
    test('4a: axe-core a11y scan (ratchet serious/critical against baseline)', async ({
        page,
    }, testInfo) => {
        // Baseline regen must never run in CI — it would launder a regression
        // into the reviewed ceiling. Same in-spec belt parity.spec.ts carries
        // (its guard only protects its own spec); workflow-level shell guards
        // are the braces, and this spec runs under configs those don't cover.
        if (process.env.CI && process.env.UPDATE_A11Y_BASELINE) {
            throw new Error(
                'Baseline regen (UPDATE_A11Y_BASELINE) must never run in CI — it would launder a regression into the canon.',
            )
        }
        const fw = byName(testInfo.project.name)
        await page.goto(PLAYGROUND(fw.name))
        await expect(page.locator('[data-testid="upup-root"]')).toBeVisible({
            timeout: 30_000,
        })

        const violations = await runAxe(page)
        const serious = violations.filter(
            v => v.impact === 'serious' || v.impact === 'critical',
        )
        const moderateMinor = violations.filter(
            v => v.impact !== 'serious' && v.impact !== 'critical',
        )
        const summary = violations.length
            ? violations.map(v => `${v.id}[${v.impact}]x${v.nodes}`).join(', ')
            : '(none)'
        // eslint-disable-next-line no-console
        console.log(
            `[axe][${fw.name}] ${violations.length} violations; serious/critical=${serious.length} :: ${summary}`,
        )
        await testInfo.attach(`axe-${fw.name}.json`, {
            body: JSON.stringify(violations, null, 2),
            contentType: 'application/json',
        })

        if (moderateMinor.length) {
            // eslint-disable-next-line no-console
            console.warn(
                `[axe][${fw.name}] moderate/minor (report-only): ${moderateMinor.map(v => `${v.id}[${v.impact}]x${v.nodes}`).join(', ')}`,
            )
        }

        if (process.env.UPDATE_A11Y_BASELINE) {
            const baseline = loadBaseline()
            baseline[fw.name] = serious.map(v => ({
                rule: v.id,
                count: v.nodes,
            }))
            writeFileSync(
                BASELINE_PATH,
                JSON.stringify(baseline, null, 2) + '\n',
            )
            test.info().annotations.push({
                type: 'a11y-baseline',
                description: `baseline written for ${fw.name}`,
            })
            return
        }

        const baseline = loadBaseline()
        const baselineForFw = baseline[fw.name] ?? []
        const newSeriousCritical = serious.filter(v => {
            const baselined = baselineForFw.find(b => b.rule === v.id)
            return !baselined || v.nodes > baselined.count
        })
        expect(
            newSeriousCritical,
            `new axe serious/critical on ${fw.name} — fix or re-baseline (UPDATE_A11Y_BASELINE=1)`,
        ).toEqual([])
    })

    // 4b — media/adapter views must not clip inside the fixed-height, overflow-hidden
    // SourceViewContainer. Camera/microphone auto-start via fake media devices; screen
    // capture (getDisplayMedia) is not driveable headlessly, so its initial view state
    // is measured (live preview verified interactively in a prior session).
    //
    // Covers geometry at each PARITY_VARIANTS density. `default` navigates today's
    // exact playground story (zero behavior change); a future density adds a
    // `<fw>-uploader--playground-<variant>` story per framework plus a live
    // per-framework overflow + spacing/touch-target check (this sweep only ever
    // catches outright clip, never cramped spacing).
    const MEDIA_VIEWS = [
        { src: 'camera', slot: 'camera-uploader' },
        { src: 'microphone', slot: 'audio-uploader' },
        { src: 'screen', slot: 'screen-capture-uploader' },
        { src: 'url', slot: 'url-uploader' },
    ] as const

    for (const variant of PARITY_VARIANTS) {
        for (const view of MEDIA_VIEWS) {
            test(`4b: ${view.src} adapter view does not clip (no overflow) [variant: ${variant}]`, async ({
                page,
            }, testInfo) => {
                const fw = byName(testInfo.project.name)
                const url =
                    variant === 'default'
                        ? PLAYGROUND(fw.name)
                        : storyUrl(`${fw.name}-uploader--playground-${variant}`)
                await page.goto(url)
                await expect(
                    page.locator('[data-testid="upup-root"]'),
                ).toBeVisible({ timeout: 30_000 })

                const sourceBtn = page.locator(
                    `[data-testid="upup-source-${view.src}"]`,
                )
                await expect(
                    sourceBtn,
                    `source button upup-source-${view.src} present`,
                ).toHaveCount(1)
                await sourceBtn.first().click()

                // The fixed-height clipping box for this view (slot attr = stable across views).
                const container = page
                    .locator(`[data-upup-slot="${view.slot}"]`)
                    .first()
                await expect(
                    container,
                    `${view.src} adapter container (slot=${view.slot}) rendered`,
                ).toBeVisible({ timeout: 15_000 })
                // sleep-allow(media autoplay/layout must settle so the geometry measurement reflects steady state — no event marks "settled")
                await page.waitForTimeout(500)

                const m = await measureOverflow(container)
                // eslint-disable-next-line no-console
                console.log(
                    `[overflow][${fw.name}][${variant}] ${view.src}: sh=${m.scrollHeight} ch=${m.clientHeight} sw=${m.scrollWidth} cw=${m.clientWidth}`,
                )
                await testInfo.attach(
                    `overflow-${fw.name}-${variant}-${view.src}.json`,
                    {
                        body: JSON.stringify(m, null, 2),
                        contentType: 'application/json',
                    },
                )

                expect(
                    m.scrollHeight,
                    `${fw.name}/${view.src} [${variant}]: vertical clip — content ${m.scrollHeight}px exceeds container ${m.clientHeight}px`,
                ).toBeLessThanOrEqual(m.clientHeight + OVERFLOW_TOL)
                expect(
                    m.scrollWidth,
                    `${fw.name}/${view.src} [${variant}]: horizontal clip — content ${m.scrollWidth}px exceeds container ${m.clientWidth}px`,
                ).toBeLessThanOrEqual(m.clientWidth + OVERFLOW_TOL)
            })
        }
    }
})
