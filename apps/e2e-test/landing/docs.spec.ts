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
        // The chat hook (use-docs-chat.ts) now tries the streaming endpoint
        // first and only falls back to /generate when the stream can't be
        // opened. 404 the stream so this test deterministically exercises the
        // /generate fallback path it was written for; the stream path has its
        // own test below.
        await page.route('**/api/agents/docs-agent/stream', route =>
            route.fulfill({ status: 404, body: '' }),
        )
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
        // The click can land before React hydration attaches the handler on a
        // cold compile (seen once under full-suite load), so retry the
        // click-then-open pair until the drawer actually responds.
        const trigger = page
            .locator('[data-testid="docs-ask-ai-trigger"]:visible')
            .first()
        const drawer = page.getByTestId('docs-ask-ai-drawer')
        await expect(async () => {
            await trigger.click()
            await expect(drawer).toBeVisible({ timeout: 2000 })
        }).toPass()
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

    test('article code blocks carry copy chrome and a language label', async ({
        page,
    }) => {
        // CodeBlock.tsx wraps every shiki <pre> in `.upup-code`, adding a
        // language label and a copy button. The button is opacity-0 until
        // group-hover, so presence is asserted structurally (attached +
        // aria-label) rather than through a synthetic hover.
        await page.goto('/docs/quickstarts/react/')
        const block = page.locator('.upup-code').first()
        await expect(block).toBeVisible()
        // aria-label starts as "Copy code" (flips to "Copied" only post-click).
        await expect(
            block.getByRole('button', { name: 'Copy code' }),
        ).toBeAttached()
        // The language label is the non-button span inside the hover overlay
        // (`pointer-events-none` row) — never a shiki token span inside <pre>.
        const label = block.locator('.pointer-events-none span').first()
        await expect(label).toBeVisible()
        await expect(label).toHaveText(/^[a-z0-9+#-]+$/i)
    })

    test('prev/next nav walks the sidebar sequence both directions', async ({
        page,
    }) => {
        await page.goto('/docs/guides/theming/')
        const nav = page.getByRole('navigation', {
            name: 'Previous and next page',
        })
        // Cards are real next/link <a href> anchors (SSR-rendered), so the
        // click navigates without waiting on hydration.
        await nav.getByRole('link').filter({ hasText: 'Next' }).click()
        await expect(page).toHaveURL(/\/docs\/guides\/headless\//)
        // The reverse edge: the headless page's Previous card must point back
        // to the theming guide, proving the sequence is symmetric.
        const prev = page
            .getByRole('navigation', { name: 'Previous and next page' })
            .getByRole('link')
            .filter({ hasText: 'Previous' })
        await expect(prev).toHaveAttribute(
            'href',
            /\/docs\/guides\/theming\/?$/,
        )
    })

    test('copy-page markdown twin is served as text/markdown', async ({
        request,
    }) => {
        // The DocsCopyPage button fetches this force-static route; it prepends
        // the frontmatter title as an H1 (route.ts), so the body opens with it.
        const res = await request.get('/docs-md/getting-started/')
        expect(res.status()).toBe(200)
        expect(res.headers()['content-type']).toContain('text/markdown')
        expect(await res.text()).toContain('# Getting Started')
    })

    test('playground CTA links into the homepage live editor', async ({
        page,
    }) => {
        await page.goto('/docs/quickstarts/react/')
        const cta = page.getByTestId('docs-playground-cta')
        await expect(cta).toBeAttached()
        await expect(cta).toHaveAttribute('href', '/#live-editor')
    })

    test('ask-ai streams a markdown answer (strong, list, link)', async ({
        page,
    }) => {
        // Exercises the primary streaming path: the hook reads text/event-stream
        // and only `text-delta` events contribute answer text. The markdown
        // renderer (MessageBody) must turn **…** into <strong>, numbered lines
        // into an <ol>, and never leak the raw `**` markers into the DOM.
        const sse =
            'data: {"type":"start"}\n\n' +
            'data: {"type":"text-delta","payload":{"text":"**Use tus** for resumable uploads.\\n\\n"}}\n\n' +
            'data: {"type":"text-delta","payload":{"text":"1. Install the package\\n"}}\n\n' +
            'data: {"type":"text-delta","payload":{"text":"2. Enable the strategy\\n\\n"}}\n\n' +
            'data: {"type":"text-delta","payload":{"text":"See [Resumable uploads](/docs/resumable-uploads/)."}}\n\n' +
            'data: {"type":"finish"}\n\n'
        await page.route('**/api/agents/docs-agent/stream', route =>
            route.fulfill({ contentType: 'text/event-stream', body: sse }),
        )
        await page.goto('/docs/getting-started/')
        const trigger = page
            .locator('[data-testid="docs-ask-ai-trigger"]:visible')
            .first()
        const drawer = page.getByTestId('docs-ask-ai-drawer')
        // Same cold-hydration guard as the fallback test: retry the open until
        // the drawer actually responds.
        await expect(async () => {
            await trigger.click()
            await expect(drawer).toBeVisible({ timeout: 2000 })
        }).toPass()
        await drawer.getByTestId('docs-ask-ai-input').fill('resumable uploads?')
        await drawer.getByTestId('docs-ask-ai-send').click()
        // Bold → <strong>.
        await expect(
            drawer.locator('strong').filter({ hasText: 'Use tus' }),
        ).toBeVisible()
        // Numbered lines → a single <ol> with one <li> per step (the per-message
        // <li>s live under a <ul>, so scoping to `ol li` isolates the answer).
        await expect(drawer.locator('ol li')).toHaveCount(2)
        // A markdown link inside a streamed chunk must render as a real
        // anchor (the link pipeline runs on streamed text too).
        await expect(
            drawer.getByRole('link', { name: 'Resumable uploads' }),
        ).toBeVisible()
        // The literal fence markers must never survive into the rendered text.
        expect(await drawer.innerText()).not.toContain('**')
    })

    test('framework tabs honor the ?fw deep link and persist across navigation', async ({
        page,
    }) => {
        // The deep link wins over any stored choice, but it is applied in a
        // post-mount effect (avoids a hydration mismatch), so the svelte tab
        // isn't selected on the very first paint — retry until the effect runs.
        await page.goto('/docs/getting-started/?fw=svelte')
        const svelteTab = page.getByTestId('docs-framework-tab-svelte')
        await expect(async () => {
            await expect(svelteTab).toHaveAttribute('aria-selected', 'true')
        }).toPass({ timeout: 15_000 })

        // The onClick handler attaches at hydration; a click landing before it
        // is a no-op, so retry the click-then-assert pair. Selecting vue also
        // writes it to localStorage (the shared reader-wide choice).
        const vueTab = page.getByTestId('docs-framework-tab-vue')
        await expect(async () => {
            await vueTab.click()
            await expect(vueTab).toHaveAttribute('aria-selected', 'true')
        }).toPass({ timeout: 15_000 })

        // Leave the topic and come back WITHOUT a ?fw param: the stored choice
        // (vue) must be re-applied from localStorage on the fresh mount.
        await page.goto('/docs/guides/theming/')
        await page.goto('/docs/getting-started/')
        const vueTabAgain = page.getByTestId('docs-framework-tab-vue')
        await expect(async () => {
            await expect(vueTabAgain).toHaveAttribute('aria-selected', 'true')
        }).toPass({ timeout: 15_000 })
    })
})
