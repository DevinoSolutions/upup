import { expect, test } from '@playwright/test'

// Proves the docs surface that now lives at /docs inside this landing app:
// the legacy Docusaurus /documentation URLs permanently redirect (the old
// standalone apps/docs app has been deleted), the fumadocs chrome (sidebar +
// search) renders real content, and the llms.txt convention path is served.

test.describe('docs', () => {
    test('legacy documentation URL permanently redirects to docs', async ({
        request,
    }) => {
        const res = await request.get('/documentation/getting-started', {
            maxRedirects: 0,
        })
        expect(res.status()).toBe(308)
        const followed = await request.get('/documentation/getting-started')
        expect(followed.url()).toContain('/docs/getting-started/')
        expect(followed.status()).toBe(200)
    })

    test('docs page renders chrome and content', async ({ page }) => {
        await page.goto('/docs/getting-started/')
        await expect(
            page.getByRole('navigation', { name: 'Docs' }),
        ).toBeVisible()
        await expect(page.getByRole('heading', { level: 1 })).toContainText(
            'Getting Started',
        )
    })

    test('docs search finds and navigates to a page', async ({ page }) => {
        await page.goto('/docs/')
        const dialog = page.getByRole('dialog')
        // DocsSearch's ⌘K listener only attaches after client hydration — a
        // keypress fired the instant navigation resolves can race it and never
        // open the dialog, which then hangs the next locator for the whole test
        // timeout (no actionTimeout is configured, so waits are unbounded).
        // Retry the press against a short, bounded wait instead of once against
        // an unbounded one.
        await expect(async () => {
            await page.keyboard.press('ControlOrMeta+k')
            await expect(dialog).toBeVisible({ timeout: 1_000 })
        }).toPass({ timeout: 15_000 })

        await dialog.getByRole('textbox').fill('theming')
        // Results render as buttons (DocsSearch.tsx), not links — the first hit
        // is the Theming guide's own page-level result.
        await dialog
            .getByRole('button', { name: /theming/i })
            .first()
            .click()
        await expect(page).toHaveURL(/\/docs\/guides\/theming\//)
    })

    test('llms corpus is served at the root convention path', async ({
        request,
    }) => {
        const res = await request.get('/llms.txt')
        expect(res.status()).toBe(200)
        expect(await res.text()).toContain('/docs/getting-started/')
    })
})
