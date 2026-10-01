import { expect, test } from '@playwright/test'

// The hero install box's package-manager menu opens downward over the
// agent-setup pill and, on stacked layouts, the hero visual. It used to render
// UNDER them: `.hero-rise` leaves a transform behind, so each hero block is its
// own stacking context and the menu's z-50 never escaped its wrapper. The menu
// looked open, but a tap on a lower option landed on the pill instead, closed
// the menu (outside-click handler) and could navigate away. Playwright's click
// refuses an occluded target, so a regression fails here instead of silently.

const STACKED_VIEWPORTS = [
    { label: 'phone', width: 390, height: 844 },
    { label: 'tablet', width: 768, height: 1024 },
]

test.describe('homepage hero install box', () => {
    for (const viewport of STACKED_VIEWPORTS) {
        test(`package-manager menu option is clickable on a ${viewport.label} (${viewport.width}px)`, async ({
            page,
        }) => {
            await page.setViewportSize({
                width: viewport.width,
                height: viewport.height,
            })
            await page.goto('/')
            await page.getByRole('button', { name: 'Package manager' }).click()
            const menu = page.getByRole('listbox', { name: 'Package manager' })
            await expect(menu).toBeVisible()

            // Bun is the last option, the one furthest into the content below.
            await menu
                .getByRole('option', { name: 'Bun' })
                .click({ timeout: 15_000 })

            await expect(menu).toBeHidden()
            await expect(
                page.locator('code', { hasText: 'bun add @useupup/react' }),
            ).toBeVisible()
        })
    }
})
