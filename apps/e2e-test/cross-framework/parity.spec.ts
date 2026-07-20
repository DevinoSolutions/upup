import { test, expect, type Page } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    byName,
    storyUrl,
    FRAMEWORKS,
    PARITY_VARIANTS,
    type ParityVariant,
} from './framework-matrix'
import { normalizeElement, type NormalizedNode } from './parity-dom'
import {
    PARITY_FIXTURES,
    KNOWN_DIVERGENCES,
    type ParityComponent,
} from './parity-fixtures'
import { A11Y_GAPS, gapSkipClasses, gapSkipRoles } from './parity-a11y-gaps'
import { captureProductStateScreenshot } from '../visual/product-state-screenshots'

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURE_PATH = join(HERE, 'parity-fixtures.json')

// 1x1 transparent PNG (drives the image FilePreview path).
const PNG_1x1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
)
const PDF_BYTES = Buffer.from('%PDF-1.4\n%minimal\n', 'utf8')

// data-testid for each parity component (the normalizer keys off these).
const COMPONENT_TESTID: Record<ParityComponent, string> = {
    sourceSelector: 'upup-source-selector',
    fileItem: 'upup-file-item',
    filePreview: 'upup-file-preview',
    fileIcon: 'upup-file-icon',
    fileList: 'upup-file-list',
    fileHero: 'upup-file-hero',
}

// Per-variant seeding + the components that variant's file-count state renders.
// sourceSelector is captured at mount (files.size === 0) for EVERY variant, so
// it is not listed here. `components[0]` is the anchor awaited before capture.
//   - default: 2 files → card list (fileItem embeds filePreview + fileIcon) + fileList.
//   - hero:    1 file  → FileHero (single-file preview) + fileList; the card-list
//              components (fileItem/filePreview/fileIcon) never render here.
const VARIANT_PLAN: Record<
    ParityVariant,
    {
        files: { name: string; mimeType: string; buffer: Buffer }[]
        components: readonly ParityComponent[]
        /** Screenshot state label for the populated capture. */
        seededState: string
    }
> = {
    default: {
        files: [
            { name: 'parity.png', mimeType: 'image/png', buffer: PNG_1x1 },
            {
                name: 'parity.pdf',
                mimeType: 'application/pdf',
                buffer: PDF_BYTES,
            },
        ],
        components: ['fileItem', 'filePreview', 'fileIcon', 'fileList'],
        seededState: 'image-and-pdf-files-added',
    },
    hero: {
        files: [{ name: 'parity.png', mimeType: 'image/png', buffer: PNG_1x1 }],
        components: ['fileHero', 'fileList'],
        seededState: 'single-image-file-hero',
    },
}

async function clearCrashRecovery(page: Page) {
    await page.evaluate(
        () =>
            new Promise<void>(resolve => {
                const req = indexedDB.deleteDatabase('upup-crash-recovery')
                req.onsuccess = () => resolve()
                req.onerror = () => resolve()
                req.onblocked = () => resolve()
            }),
    )
}

async function normalize(
    page: Page,
    selector: string,
): Promise<NormalizedNode> {
    await page
        .locator(selector)
        .first()
        .waitFor({ state: 'attached', timeout: 15_000 })
    return page.$eval(selector, normalizeElement, {
        classes: gapSkipClasses(),
        roles: gapSkipRoles(),
    })
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
    variant: ParityVariant,
    component: ParityComponent,
    captured: NormalizedNode,
    fwName: string,
    label: string,
) {
    const canon = PARITY_FIXTURES[variant][component]
    const divergence = KNOWN_DIVERGENCES[component]
    if (!divergence || divergence.assertOnly.includes(fwName)) {
        expect.soft(captured, label).toEqual(canon)
        return
    }
    // Excepted framework: prove the documented divergence still holds. If this
    // ever passes (capture now equals canon), the fix landed -- remove the
    // KNOWN_DIVERGENCES entry for `component` instead of leaving it stale.
    expect
        .soft(
            captured,
            `${label} — divergence healed, remove the KNOWN_DIVERGENCES entry for ${component} (${divergence.reason})`,
        )
        .not.toEqual(canon)
}

test.describe('cross-framework DOM + a11y parity', () => {
    for (const variant of PARITY_VARIANTS) {
        test(`renders the agreed contract on every framework (variant: ${variant})`, async ({
            page,
        }, testInfo) => {
            // Fixture/baseline regen must never run in CI -- it would launder a
            // regression into the canon regardless of which workflow invokes this
            // spec. Provider-agnostic (throws here) + the fail-fast e2e.yml guard
            // (Fix 10) are two independent layers against the same mistake.
            if (
                process.env.CI &&
                (process.env.UPDATE_PARITY || process.env.UPDATE_A11Y_BASELINE)
            ) {
                throw new Error(
                    'Fixture/baseline regen (UPDATE_PARITY/UPDATE_A11Y_BASELINE) must never run in CI — it would launder a regression into the canon.',
                )
            }

            const fw = byName(testInfo.project.name)

            await page.goto(storyUrl(fw.parityStoryIds[variant]))
            await expect(page.locator('[data-testid="upup-root"]')).toBeVisible(
                { timeout: 30_000 },
            )
            await clearCrashRecovery(page)
            await page.reload()
            await expect(page.locator('[data-testid="upup-root"]')).toBeVisible(
                { timeout: 30_000 },
            )

            // Visual layer (snapvisor): freeze the rendered mount state. The DOM
            // parity below can never see geometry/paint — the screenshot can.
            await captureProductStateScreenshot(page, {
                suite: 'cross-framework',
                framework: fw.name,
                flow: `uploader-parity-${variant}`,
                state: 'mount-source-selector',
            })

            // SourceSelector is present at mount (files.size === 0) for every variant.
            const sourceSelector = await normalize(
                page,
                '[data-testid="upup-source-selector"]',
            )

            const plan = VARIANT_PLAN[variant]

            // Seed the variant's files. default: image + PDF → card list; hero:
            // one image → FileHero. Anchor = the first populated component.
            const fileInput = page.locator('[data-testid="upup-file-input"]')
            if ((await fileInput.count()) === 0) {
                const localSource = page.locator(
                    '[data-testid="upup-source-local"]',
                )
                if (await localSource.count()) await localSource.first().click()
            }
            await fileInput
                .first()
                .waitFor({ state: 'attached', timeout: 15_000 })
            await fileInput.first().setInputFiles(plan.files)

            const anchor = plan.components[0]!
            await expect(
                page
                    .locator(`[data-testid="${COMPONENT_TESTID[anchor]}"]`)
                    .first(),
            ).toBeVisible({ timeout: 15_000 })

            // Visual layer (snapvisor): the populated file state for this variant
            // (card list for default, single-file hero for hero) — same name
            // contract across every framework.
            await captureProductStateScreenshot(page, {
                suite: 'cross-framework',
                framework: fw.name,
                flow: `uploader-parity-${variant}`,
                state: plan.seededState,
            })

            const captured: Partial<Record<ParityComponent, NormalizedNode>> = {
                sourceSelector,
            }
            for (const component of plan.components) {
                captured[component] = await normalize(
                    page,
                    `[data-testid="${COMPONENT_TESTID[component]}"]`,
                )
            }

            // Capture mode (react only): seed/refresh the fixtures for this variant, then hand-edit to target.
            if (process.env.UPDATE_PARITY && fw.name === 'react') {
                const existing = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'))
                writeFileSync(
                    FIXTURE_PATH,
                    JSON.stringify(
                        { ...existing, [variant]: captured },
                        null,
                        2,
                    ) + '\n',
                )
                test.info().annotations.push({
                    type: 'parity',
                    description: `fixtures written (variant: ${variant})`,
                })
                return
            }

            // Self-liquidating manifest: a gap whose `ported` covers EVERY framework
            // has healed -- its entry must be deleted (and fixtures recaptured, since
            // the normalizer stops skipping its token). Without this check a healed
            // entry silently excludes its token from parity capture forever (the
            // sr-only-live-region entry did exactly that after C1 closed the gap).
            for (const gap of A11Y_GAPS) {
                expect(
                    FRAMEWORKS.every(f => gap.ported.includes(f.name)),
                    `${gap.id}: ported=[${gap.ported.join(', ')}] covers every framework -- the gap has healed; delete the entry from parity-a11y-gaps.ts and recapture fixtures (UPDATE_PARITY=1)`,
                ).toBe(false)
            }

            // Forcing-function for each tracked a11y gap (parity-a11y-gaps.ts): the
            // populated DOM is queried directly (not via the normalizer, which strips
            // these tokens by design) so a token's presence maps 1:1 onto the gap's
            // `ported` list. Fails when a non-ported framework gains the token
            // (divergence closable -> update the manifest) or a ported framework loses
            // it (regression) -- silent permanent drift becomes a tracked decision.
            for (const gap of A11Y_GAPS) {
                const locator =
                    gap.kind === 'class'
                        ? page.locator(`.${gap.token}`)
                        : page.locator(`[role="${gap.token}"]`)
                const present = (await locator.count()) > 0
                expect(
                    present,
                    `${fw.name}: ${gap.token} presence should match parity-a11y-gaps.ts ported=[${gap.ported.join(', ')}] -- update the manifest if this framework ported the gap`,
                ).toBe(gap.ported.includes(fw.name))
            }

            // Soft assertions so a single run reports ALL of the variant's
            // component mismatches at once (default's composite fileItem embeds
            // the fileIcon + filePreview subtrees, so a hard assert would mask
            // the leaf results behind the first failure). Assert exactly the
            // components this variant rendered: sourceSelector (mount) plus the
            // variant's populated set. fileList carries the documented
            // F-711/F-712 divergences (KNOWN_DIVERGENCES) — react/preact
            // hard-asserted, the others inverse-forced so the exception can't
            // silently outlive the bugs it names.
            //
            // Fix 4 (D1): the hidden file input is `upup-hidden` (display:none) + aria-hidden
            // + tabindex=-1 — invisible plumbing. React/Vue render it inside SourceSelector;
            // Svelte/Angular own it in the shell. The normalizer skips `upup-hidden` subtrees,
            // so this asserts the VISIBLE + a11y SourceSelector contract only. The input's DOM
            // location stays a per-framework implementation detail (no runtime-contract rewrite).
            for (const component of [
                'sourceSelector',
                ...plan.components,
            ] as ParityComponent[]) {
                assertComponentParity(
                    variant,
                    component,
                    captured[component]!,
                    fw.name,
                    `${component} parity`,
                )
            }
        })
    }
})
