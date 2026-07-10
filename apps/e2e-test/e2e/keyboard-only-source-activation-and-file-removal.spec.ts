import { test, expect, type Locator, type Page } from '@playwright/test'
import { FILE_2KB, clearCrashRecovery } from './helpers'

/**
 * Keyboard-only operation of the uploader's primary flows (WCAG 2.1.1).
 * The deep suite's only prior keyboard coverage was Escape-closes-preview
 * (file-interactions.spec.ts); nothing proved a keyboard user can REACH and
 * ACTIVATE the interactive surface at all. These tests never touch the
 * pointer: reachability is proven by walking real Tab stops from the top of
 * the document, activation by Enter/Space on the focused element.
 *
 * Scope note: picking a file inside the native OS chooser happens outside
 * the DOM (Playwright cannot drive that dialog by keyboard), so the removal
 * test adds its file programmatically and proves the keyboard half —
 * reaching the tile's remove button and activating it.
 */

/** Presses Tab from the current focus point until `target` holds focus.
 *  Bounded: a target silently dropped from the tab order (e.g. by a
 *  visibility:hidden reveal pattern or a positive tabindex shuffle) fails
 *  loudly instead of spinning forever. */
async function tabUntilFocused(
    page: Page,
    target: Locator,
    maxTabs = 40,
): Promise<void> {
    for (let i = 0; i < maxTabs; i++) {
        await page.keyboard.press('Tab')
        const focused = await target
            .evaluate(el => el === document.activeElement)
            .catch(() => false)
        if (focused) return
    }
    throw new Error(
        `target never received focus within ${maxTabs} Tab presses — not keyboard-reachable`,
    )
}

test.describe('Keyboard-only source activation and file removal', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await clearCrashRecovery(page)
        await page.reload()
        await expect(page.locator('[data-testid="upup-root"]')).toBeVisible()
    })

    test('a keyboard-only user can Tab to the Link source, open its view with Enter, and leave it again with Space on Cancel', async ({
        page,
    }) => {
        const linkSource = page.getByRole('button', { name: 'Link' })
        await tabUntilFocused(page, linkSource)
        await expect(linkSource).toBeFocused()

        await page.keyboard.press('Enter')
        await expect(page.getByPlaceholder('Enter file url')).toBeVisible()

        // Space must also activate (native button contract) — leave the view
        // through its Cancel control. Opening the view unmounted the focused
        // source button, so the walk restarts from the document top.
        const cancel = page.getByRole('button', { name: 'Cancel' })
        await tabUntilFocused(page, cancel)
        await page.keyboard.press('Space')

        await expect(page.getByPlaceholder('Enter file url')).not.toBeVisible()
        await expect(linkSource).toBeVisible()
    })

    test('a keyboard-only user can open the native file chooser from the browse-files button with Enter', async ({
        page,
    }) => {
        const browse = page.locator('[data-testid="upup-browse-files"]')
        await tabUntilFocused(page, browse)

        const chooserPromise = page.waitForEvent('filechooser')
        await page.keyboard.press('Enter')
        const chooser = await chooserPromise

        // maxFiles=99 in the harness app — the chooser must allow multi-select.
        expect(chooser.isMultiple()).toBe(true)
    })

    test('a keyboard-only user can remove an added file with Enter on its remove button, and the tile disappears', async ({
        page,
    }) => {
        await page.setInputFiles('[data-testid="upup-file-input"]', {
            name: 'keyboard-remove-me.txt',
            mimeType: 'text/plain',
            buffer: FILE_2KB,
        })
        await expect(
            page.locator('[data-testid="upup-file-item"]'),
        ).toBeVisible()

        // The remove button is pointer-revealed visually but stays in the
        // accessibility tree and tab order (no visibility:hidden) — a
        // keyboard user reaches it without any hover.
        const remove = page.locator('[data-testid="upup-file-remove"]')
        await tabUntilFocused(page, remove)
        await page.keyboard.press('Enter')

        await expect(
            page.locator('[data-testid="upup-file-item"]'),
        ).not.toBeVisible()
    })
})
