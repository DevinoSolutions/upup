// Warm-up gate for the six storybook dev servers. Playwright's webServer
// readiness is TCP-accept, but a vite storybook binds its port immediately and
// compiles the story bundle on FIRST request — so on a cold CI runner the first
// test to hit a framework pays that compile inside its own 30s visibility
// timeout. Six concurrent cold prebundles on a 2-core runner routinely push the
// slowest framework past 30s, which shows up as a roaming, framework-random
// "upup-root not visible" failure (2026-07-07: preact ×3, then vanilla ×1 on
// the SAME commit). This setup project renders every framework's parity story
// once, under the same generous ceiling the server boot already gets, so the
// real tests always start against warm bundles. Framework projects declare
// `dependencies: ['warmup']` — Playwright orders it before all of them.
import { test, expect } from '@playwright/test'
import { FRAMEWORKS, storyUrl } from './framework-matrix'

// Mirrors the 420s webServer bind ceiling in playwright-shared.ts: costs
// nothing warm, only prevents a premature cold-start failure.
const WARMUP_BUDGET_MS = 420_000

test('warm up all six storybooks (first-request story compile)', async ({
    browser,
}) => {
    test.setTimeout(WARMUP_BUDGET_MS)
    const started = Date.now()
    // All six in parallel: the contention happens here, inside the warm-up
    // budget, instead of inside a real test's 30s assertion window.
    await Promise.all(
        FRAMEWORKS.map(async fw => {
            const page = await browser.newPage()
            try {
                const url = `http://localhost:${fw.port}${storyUrl(fw.parityStoryIds.default)}`
                await page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: WARMUP_BUDGET_MS - 30_000,
                })
                await expect(
                    page.locator('[data-testid="upup-root"]'),
                    `${fw.name} storybook rendered its parity story`,
                ).toBeVisible({ timeout: WARMUP_BUDGET_MS - 60_000 })
                // eslint-disable-next-line no-console
                console.log(
                    `[cf-warmup] ${fw.name} ready in ${Math.round((Date.now() - started) / 1000)}s`,
                )
            } finally {
                await page.close()
            }
        }),
    )
})
