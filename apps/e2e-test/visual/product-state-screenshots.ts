import type { Locator, Page } from '@playwright/test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Visual layer for the E2E suites: freezes named PRODUCT STATES as stable PNGs
// under apps/e2e-test/screenshots/ (gitignored — CI uploads the directory as a
// build artifact). The screenshots are review evidence today and become the
// input for snapvisor.io (our Argos-style visual-diff service) once its
// uploader is wired: snapvisor owns baselines/diffs server-side, so this repo
// deliberately commits NO golden images and the capture path has no regen mode
// to guard. Determinism rules: captures are element shots of the uploader root
// in CSS pixels (DPR-independent), with animations fast-forwarded, the caret
// hidden, fonts and image decodes settled first, and inherently-live regions
// (progress bars) masked by the caller. This closes the documented parity-
// harness blind spot: normalized-DOM comparison can never see rendered
// geometry, spacing, or paint.

const SCREENSHOTS_ROOT = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'screenshots',
)

/** Kebab-safe path segment: the naming contract snapvisor will key diffs on. */
const segment = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

export interface ProductStateScreenshot {
    /** Which harness produced the capture. */
    suite: 'cross-framework' | 'deep-react'
    /** Framework under test (cf project name) or `react` for the deep suite. */
    framework: string
    /** Product flow the state belongs to, e.g. `uploader-parity`. */
    flow: string
    /** The product state being frozen, e.g. `mount-source-selector`. */
    state: string
    /** Capture subject; defaults to the shared uploader root. */
    subject?: Locator
    /** Regions whose pixels are inherently nondeterministic (live progress). */
    mask?: Locator[]
}

/**
 * Freeze one named product state as a deterministic PNG. Returns the written
 * path so specs can attach it to the Playwright report. Never sleeps: waits
 * are all event-driven (font readiness, image decode, subject visibility).
 */
export async function captureProductStateScreenshot(
    page: Page,
    shot: ProductStateScreenshot,
): Promise<string> {
    // Text metrics shift while webfonts stream in — wait for the ready signal.
    await page.evaluate(() => document.fonts.ready)
    // A preview captured mid-decode paints as a partial/blank image; decode
    // failures (broken/removed img) are non-fatal — the capture shows reality.
    await page.evaluate(async () => {
        await Promise.all(
            Array.from(document.images).map(img =>
                img.decode().catch(() => undefined),
            ),
        )
    })

    const subject =
        shot.subject ?? page.locator('[data-testid="upup-root"]').first()
    await subject.waitFor({ state: 'visible' })

    const path = join(
        SCREENSHOTS_ROOT,
        shot.suite,
        segment(shot.framework),
        `${segment(shot.flow)}--${segment(shot.state)}.png`,
    )
    await subject.screenshot({
        path,
        animations: 'disabled', // fast-forward CSS animation/transition state
        caret: 'hide',
        scale: 'css', // 1 CSS px = 1 image px, independent of device DPR
        mask: shot.mask,
        maskColor: '#ff00ff',
    })
    return path
}
