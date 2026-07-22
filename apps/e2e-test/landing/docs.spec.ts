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

    test('legacy category/section index URLs land on a real page', async ({
        request,
    }) => {
        // Docusaurus generated-index pages have no counterpart in the new
        // tree; each maps to its section's first page (meta.json order). The
        // wildcard alone would send these to /docs/category/* 404s.
        const cases: Array<[string, RegExp]> = [
            ['/documentation/quickstarts', /\/docs\/quickstarts\/react\/$/],
            [
                '/documentation/comparisons',
                /\/docs\/comparisons\/upup-vs-uppy\/$/,
            ],
            [
                '/documentation/category/api-reference',
                /\/docs\/api-reference\/s3-generate-presigned-url\/$/,
            ],
            [
                '/documentation/category/upupuploader',
                /\/docs\/api-reference\/upupuploader\/required-props\/$/,
            ],
        ]
        for (const [legacy, target] of cases) {
            const followed = await request.get(legacy)
            expect(followed.url(), `${legacy} final URL`).toMatch(target)
            expect(followed.status(), `${legacy} final status`).toBe(200)
        }
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

    test('docs home renders hero, framework grid, and section cards navigate', async ({
        page,
    }) => {
        await page.goto('/docs/')
        await expect(
            page.getByRole('heading', { level: 1, name: /ship uploads/i }),
        ).toBeVisible()
        const grid = page.getByTestId('docs-framework-grid')
        await expect(grid.getByRole('link')).toHaveCount(7)
        // Section cards fade in via framer-motion's whileInView — click()
        // auto-scrolls and auto-waits as part of its own actionability check,
        // so no separate scrollIntoViewIfNeeded call is needed (a standalone
        // one raced the animation's re-render and threw a stale-handle error).
        const gettingStartedCard = page
            .getByTestId('docs-section-cards')
            .getByRole('link', { name: /getting started/i })
        await gettingStartedCard.click()
        await expect(page).toHaveURL(/\/docs\/getting-started\/$/)
    })

    test('live uploader demo accepts a file without a backend', async ({
        page,
    }) => {
        await page.goto('/docs/getting-started/')
        const demo = page.getByTestId('docs-uploader-demo')
        // The uploader is dynamically imported client-side (ssr:false) and
        // shows a "Loading demo…" placeholder first, so the real input isn't
        // attached yet on navigation. setInputFiles only requires the element
        // to be attached (not visible) and auto-waits for that, so no manual
        // scroll/visibility wait is needed here either. Same contract testid
        // the deep e2e suite drives (apps/e2e-test/e2e/file-interactions.spec.ts).
        await demo.locator('[data-testid="upup-file-input"]').setInputFiles({
            name: 'hello.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('hello docs'),
        })
        await expect(demo.getByText('hello.txt')).toBeVisible()
    })

    test('ask-ai panel answers (mocked agent) and survives navigation', async ({
        page,
    }) => {
        await page.route('**/api/agents/docs-agent/generate', route =>
            route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    text: 'Use the tus strategy. See [Resumable uploads](/docs/resumable-uploads/).',
                }),
            }),
        )
        await page.goto('/docs/getting-started/')
        // Two DOM mounts share this testid (mobile-menu + desktop sidebar);
        // at the default desktop e2e viewport only the desktop one is
        // visible — the mobile mount sits inside a `lg:hidden` container.
        await page
            .locator('[data-testid="docs-ask-ai-trigger"]:visible')
            .first()
            .click()
        const drawer = page.getByTestId('docs-ask-ai-drawer')
        await expect(drawer).toBeVisible()
        await drawer.getByTestId('docs-ask-ai-input').fill('resumable uploads?')
        await drawer.getByTestId('docs-ask-ai-send').click()
        const citation = drawer.getByRole('link', {
            name: 'Resumable uploads',
        })
        await expect(citation).toBeVisible()
        await citation.click()
        await expect(page).toHaveURL(/\/docs\/resumable-uploads\/$/)
        await expect(drawer).toBeVisible()
        await expect(drawer.getByText('resumable uploads?')).toBeVisible()
    })

    test('architecture diagram renders on the modes guide', async ({
        page,
    }) => {
        await page.goto('/docs/guides/modes/')
        await expect(page.locator('[data-docs-diagram="modes"]')).toBeVisible()
    })
})
