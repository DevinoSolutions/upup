import { expect, test } from '@playwright/test'

// Proves the search-facing surface of the pages that carry the site's organic
// traffic, against the real landing dev server: status, one visible h1, the
// production canonical, title/description lengths, parseable JSON-LD with
// well-formed breadcrumbs, FAQ questions that are visible on the page, the
// crawler files, and the two conversion paths out of the landing pages.
// Nothing is mocked; every assertion reads what the server actually rendered.

// The configured site origin, resolved the way apps/landing/src/lib/site-url.ts
// resolves it. The webServer env is merged over process.env, so a
// NEXT_PUBLIC_BASE_URL set for the run reaches both the server and this spec.
const ORIGIN = (
    process.env.NEXT_PUBLIC_BASE_URL || 'https://useupup.com'
).replace(/\/+$/, '')

type Surface = {
    path: string
    /** The page must emit a BreadcrumbList (validated wherever one exists). */
    breadcrumbs: boolean
    /** The page must emit an FAQPage (validated wherever one exists). */
    faq: boolean
}

const FRAMEWORKS = ['react', 'vue', 'svelte', 'angular', 'vanilla', 'preact']

// Each per-framework roundup and the framework page its demo CTA points at.
const ROUNDUP_FRAMEWORKS = [
    { slug: 'react', framework: 'react', name: 'React', quickstart: 'React' },
    { slug: 'vue', framework: 'vue', name: 'Vue', quickstart: 'Vue' },
    {
        slug: 'angular',
        framework: 'angular',
        name: 'Angular',
        quickstart: 'Angular',
    },
    {
        slug: 'vanilla-js',
        framework: 'vanilla',
        name: 'vanilla JS',
        quickstart: 'Vanilla JS',
    },
]

const SURFACES: Surface[] = [
    { path: '/', breadcrumbs: false, faq: true },
    ...FRAMEWORKS.map(id => ({
        path: `/${id}/`,
        breadcrumbs: true,
        faq: true,
    })),
    { path: '/docs/', breadcrumbs: false, faq: false },
    { path: '/docs/guides/storage/azure-blob/', breadcrumbs: true, faq: true },
    {
        path: '/docs/guides/storage/digitalocean-spaces/',
        breadcrumbs: true,
        faq: true,
    },
    { path: '/docs/guides/server-mode-setup/', breadcrumbs: true, faq: false },
    {
        path: '/docs/guides/s3-presigned-url-upload-react/',
        breadcrumbs: true,
        faq: true,
    },
    {
        path: '/docs/comparisons/upup-vs-uploadthing/',
        breadcrumbs: true,
        faq: true,
    },
    ...ROUNDUP_FRAMEWORKS.map(({ slug }) => ({
        path: `/docs/comparisons/best-${slug}-file-upload-libraries/`,
        breadcrumbs: true,
        faq: true,
    })),
]

const TUTORIAL_PATH = '/docs/guides/s3-presigned-url-upload-react/'

type JsonLdNode = Record<string, unknown>
type Crumb = { position?: unknown; name?: unknown; item?: unknown }

/** Every node in a JSON-LD value, with arrays and `@graph` wrappers opened. */
function jsonLdNodes(value: unknown): JsonLdNode[] {
    if (Array.isArray(value)) return value.flatMap(jsonLdNodes)
    if (value && typeof value === 'object') {
        const node = value as JsonLdNode
        return Array.isArray(node['@graph'])
            ? jsonLdNodes(node['@graph'])
            : [node]
    }
    return []
}

/** A crumb's `item` is either a URL string or a node carrying `@id`. */
function crumbUrl(item: unknown): string | undefined {
    if (typeof item === 'string') return item
    if (item && typeof item === 'object') {
        const id = (item as JsonLdNode)['@id']
        if (typeof id === 'string') return id
    }
    return undefined
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()

test.describe('seo surfaces', () => {
    for (const surface of SURFACES) {
        const { path } = surface

        test(`${path} serves one h1, the production canonical, bounded title and description, and valid JSON-LD`, async ({
            page,
            request,
        }) => {
            const response = await page.goto(path)
            expect(response?.status(), `${path} status`).toBe(200)
            expect(new URL(page.url()).pathname, 'no redirect').toBe(path)

            await expect(page.locator('h1:visible')).toHaveCount(1)

            const canonical = page.locator('link[rel="canonical"]')
            await expect(canonical).toHaveCount(1)
            await expect(canonical).toHaveAttribute('href', `${ORIGIN}${path}`)

            const title = await page.title()
            expect(title.length, `title "${title}"`).toBeGreaterThan(0)
            expect(title.length, `title "${title}"`).toBeLessThanOrEqual(70)

            const description = page.locator('meta[name="description"]')
            await expect(description).toHaveCount(1)
            const content = (await description.getAttribute('content')) ?? ''
            expect(
                content.length,
                `description "${content}"`,
            ).toBeGreaterThanOrEqual(50)
            expect(
                content.length,
                `description "${content}"`,
            ).toBeLessThanOrEqual(160)

            const blocks = await page
                .locator('script[type="application/ld+json"]')
                .allTextContents()
            expect(blocks.length, 'JSON-LD blocks').toBeGreaterThan(0)
            const nodes = blocks.flatMap((raw, index) => {
                expect(
                    () => JSON.parse(raw),
                    `JSON-LD block ${index} parses`,
                ).not.toThrow()
                return jsonLdNodes(JSON.parse(raw))
            })

            // Breadcrumbs: positions run 1..n, and every crumb except the
            // current page links a live page on the production origin.
            const crumbLists = nodes.filter(
                node => node['@type'] === 'BreadcrumbList',
            )
            if (surface.breadcrumbs) {
                expect(crumbLists.length, 'BreadcrumbList').toBeGreaterThan(0)
            }
            const parentUrls: URL[] = []
            for (const list of crumbLists) {
                const crumbs = (list.itemListElement ?? []) as Crumb[]
                expect(crumbs.length, 'crumb count').toBeGreaterThan(0)
                expect(crumbs.map(crumb => crumb.position)).toEqual(
                    crumbs.map((_, index) => index + 1),
                )
                const parents = crumbs.slice(0, -1)
                const withoutItem = parents
                    .filter(crumb => !crumbUrl(crumb.item))
                    .map(crumb => crumb.name)
                expect(withoutItem, 'crumbs missing `item`').toEqual([])
                parentUrls.push(
                    ...parents.map(
                        crumb => new URL(crumbUrl(crumb.item) ?? ''),
                    ),
                )
            }
            for (const url of parentUrls) {
                expect(url.origin, `crumb ${url.href}`).toBe(ORIGIN)
            }
            // Fetch each PATH from this server — following the absolute URL
            // would test production, not this build.
            const crumbTargets = await Promise.all(
                parentUrls.map(
                    async url =>
                        `${url.pathname} -> ${(await request.get(url.pathname)).status()}`,
                ),
            )
            expect(crumbTargets, 'crumb targets on this server').toEqual(
                parentUrls.map(url => `${url.pathname} -> 200`),
            )

            // FAQ rich results are only eligible when every question is
            // visible on the page itself.
            const faqPages = nodes.filter(node => node['@type'] === 'FAQPage')
            if (surface.faq) {
                expect(faqPages.length, 'FAQPage').toBeGreaterThan(0)
            }
            if (faqPages.length > 0) {
                const visibleText = normalize(
                    await page.locator('body').innerText(),
                )
                for (const faqPage of faqPages) {
                    const questions = (
                        (faqPage.mainEntity ?? []) as Array<{ name?: unknown }>
                    ).map(question => normalize(String(question.name ?? '')))
                    expect(questions.length, 'FAQ questions').toBeGreaterThan(0)
                    const notOnPage = questions.filter(
                        question => !visibleText.includes(question),
                    )
                    expect(notOnPage, 'FAQ questions not visible').toEqual([])
                }
            }
        })
    }

    test('robots.txt points crawlers at the sitemap', async ({ request }) => {
        const res = await request.get('/robots.txt')
        expect(res.status()).toBe(200)
        expect(await res.text()).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`)
    })

    test('sitemap.xml lists every covered page, including the S3 presigned-URL tutorial', async ({
        request,
    }) => {
        const res = await request.get('/sitemap.xml')
        expect(res.status()).toBe(200)
        const body = await res.text()
        const locs = new Set(
            [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]),
        )
        const missing = SURFACES.map(({ path }) => `${ORIGIN}${path}`).filter(
            url => !locs.has(url),
        )
        expect(missing, 'covered pages missing from the sitemap').toEqual([])
    })

    // The drive sign-in popups land on these paths with a one-time code. They
    // used to render the site's 404; now each is a real, never-indexed page
    // that stays out of the sitemap.
    for (const [path, provider] of [
        ['/od_redirect/', 'OneDrive'],
        ['/dp_redirect/', 'Dropbox'],
        ['/box_redirect/', 'Box'],
    ] as const) {
        test(`drive sign-in popup page ${path} renders and is noindex`, async ({
            page,
            request,
        }) => {
            const res = await page.goto(`${path}?code=e2e-code&state=e2e-state`)
            expect(res?.status()).toBe(200)
            await expect(page.locator('h1')).toHaveText(
                `Finishing ${provider} sign-in…`,
            )
            await expect(
                page.locator('meta[name="robots"]').first(),
            ).toHaveAttribute('content', /noindex/)

            const sitemap = await (await request.get('/sitemap.xml')).text()
            expect(sitemap).not.toContain(path)
        })
    }

    test('llms.txt is served and links the S3 presigned-URL tutorial', async ({
        request,
    }) => {
        const res = await request.get('/llms.txt')
        expect(res.status()).toBe(200)
        expect(await res.text()).toContain(`](${ORIGIN}${TUTORIAL_PATH})`)
    })

    test('React Quickstart CTA on /react/ opens the quickstart showing the install command', async ({
        page,
    }) => {
        await page.goto('/react/')
        // exact: the page's related-docs list also links the quickstart as
        // "React quickstart"; the case-sensitive exact name is the hero CTA.
        await page
            .getByRole('link', { name: 'React Quickstart', exact: true })
            .click()
        await expect(page).toHaveURL(/\/docs\/quickstarts\/react\/$/)
        await expect(
            page
                .locator('pre')
                .filter({ hasText: /^\s*npm i @useupup\/react\s*$/ }),
        ).toBeVisible()
    })

    // Roundup readers stayed ~40 s and left without a click: the first link to
    // the product sat ~1,500 px down the page. Each roundup now opens with a
    // demo + quickstart CTA right under its short answer.
    for (const { slug, framework, name, quickstart } of ROUNDUP_FRAMEWORKS) {
        test(`the ${name} roundup opens with a live-demo CTA that lands on the /${framework}/ demo`, async ({
            page,
            request,
        }) => {
            await page.setViewportSize({ width: 1280, height: 800 })
            await page.goto(
                `/docs/comparisons/best-${slug}-file-upload-libraries/`,
            )

            const demoLink = page.getByRole('link', {
                name: `live ${name} demo`,
                exact: true,
            })
            const quickstartLink = page
                .getByRole('link', {
                    name: `${quickstart} quickstart`,
                    exact: true,
                })
                .first()
            await expect(demoLink).toBeInViewport()
            await expect(quickstartLink).toBeInViewport()
            // Above the comparison table, not buried after it.
            const ctaTop = (await demoLink.boundingBox())?.y ?? Infinity
            const tableTop =
                (await page.locator('table').first().boundingBox())?.y ?? -1
            expect(ctaTop, 'CTA sits above the table').toBeLessThan(tableTop)

            const quickstartHref =
                (await quickstartLink.getAttribute('href')) ?? ''
            expect(quickstartHref).toMatch(
                new RegExp(`^/docs/quickstarts/${framework}/?$`),
            )
            expect((await request.get(quickstartHref)).status()).toBe(200)

            await demoLink.click()
            await expect(page).toHaveURL(new RegExp(`/${framework}/#demo$`))
            const demo = page.locator('#demo')
            await expect(demo).toBeInViewport()
            // The demo mounts on approach, so an attached file input proves
            // the uploader itself loaded.
            await expect(
                demo.locator('[data-testid="upup-file-input"]'),
            ).toBeAttached()
        })
    }

    test('Try Live Demo on the homepage brings the live uploader into view', async ({
        page,
    }) => {
        await page.goto('/')
        const demo = page.locator('#demo')
        // Below the fold on load, so the click is what brings it into view.
        await expect(demo).not.toBeInViewport()
        await page
            .getByRole('link', { name: 'Try Live Demo', exact: true })
            .click()
        await expect(page).toHaveURL(/#demo$/)
        await expect(demo).toBeInViewport()
        // The demo mounts on approach (DeferredInteractiveExample), so an
        // attached file input proves the uploader itself loaded.
        await expect(
            demo.locator('[data-testid="upup-file-input"]'),
        ).toBeAttached()
    })
})
