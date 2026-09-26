import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import {
    LEGACY_DOCUSAURUS,
    checkDocsLinks,
    compileRedirects,
    extractRedirects,
    legacyDocusaurusUrls,
    resolveRedirect,
    slug,
} from './check-links.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const fixture = (...p) => resolve(HERE, '__fixtures__', ...p)

// A miniature legacy Docusaurus surface matching the fixture content tree
// (index.mdx + guide.mdx): one doc page and one generated-index section, so
// six legacy URLs across the two route shapes.
const LEGACY_FIXTURE = {
    pages: ['guide'],
    generatedIndexes: ['category/guides'],
    customSlugIndexes: [],
}

const VALID = {
    contentDir: fixture('valid', 'content'),
    nextConfigPath: fixture('valid', 'redirects.config.txt'),
    legacy: LEGACY_FIXTURE,
}
const BROKEN = {
    contentDir: fixture('broken', 'content'),
    nextConfigPath: fixture('broken', 'redirects.config.txt'),
    legacy: LEGACY_FIXTURE,
}
const withLegacyConfig = name => ({
    contentDir: fixture('valid', 'content'),
    nextConfigPath: fixture(name),
    legacy: LEGACY_FIXTURE,
})
const legacyFailures = opts =>
    checkDocsLinks(opts).failures.filter(f => f.kind === 'LEGACY')

const REAL_CONFIG = resolve(HERE, '../../apps/landing/next.config.mjs')
const realRedirects = () =>
    compileRedirects(extractRedirects(readFileSync(REAL_CONFIG, 'utf8')))
        .compiled

test('slugger reproduces fumadocs heading ids for special-character headings', () => {
    // Pinned against the actual built docs output (rehype-slug / github-slugger
    // v2): `## Mode (light / dark / system)` renders id="mode-light--dark--system".
    assert.equal(
        slug('Mode (light / dark / system)'),
        'mode-light--dark--system',
    )
    assert.equal(slug('maxRetries'), 'maxretries')
    assert.equal(
        slug('Headless: UpupThemeProvider'),
        'headless-upupthemeprovider',
    )
})

test('a corpus of valid links, anchors, and redirects passes with no failures', () => {
    const { failures, counts } = checkDocsLinks(VALID)
    assert.deepEqual(failures, [], JSON.stringify(failures, null, 2))
    assert.equal(counts.pages, 2)
    assert.ok(
        counts.linksChecked >= 3,
        'expected the fixture links to be walked',
    )
    assert.ok(
        counts.anchorsChecked >= 2,
        'expected the fixture anchors to be walked',
    )
    assert.equal(counts.redirectsChecked, 5)
    assert.equal(counts.legacyUrlsChecked, 6)
})

test('a config the redirects scanner cannot parse fails instead of dropping the leg to zero', () => {
    const { failures } = checkDocsLinks({
        contentDir: fixture('valid', 'content'),
        nextConfigPath: fixture('no-redirects.config.txt'),
    })
    const scanner = failures.filter(f => f.kind === 'REDIRECT')
    assert.equal(scanner.length, 1)
    assert.match(scanner[0].reason, /scanner no longer matches/)
})

test('a link to a nonexistent page is reported as a LINK failure', () => {
    const { failures } = checkDocsLinks(BROKEN)
    const link = failures.find(f => f.kind === 'LINK')
    assert.ok(link, 'expected a LINK failure')
    assert.match(link.reason, /\/docs\/missing does not exist/)
})

test('a fragment pointing at a missing heading is reported as an ANCHOR failure', () => {
    const { failures } = checkDocsLinks(BROKEN)
    const anchor = failures.find(f => f.kind === 'ANCHOR')
    assert.ok(anchor, 'expected an ANCHOR failure')
    assert.match(anchor.reason, /#nope is not a heading on \/docs\/guide/)
})

test('a relative link is reported as a RELATIVE failure and told to become absolute', () => {
    const { failures } = checkDocsLinks(BROKEN)
    const rel = failures.find(f => f.kind === 'RELATIVE')
    assert.ok(rel, 'expected a RELATIVE failure')
    assert.match(rel.reason, /absolute \/docs\/\.\.\. link/)
})

test('a redirect target that resolves to no page is reported as a REDIRECT failure', () => {
    const { failures } = checkDocsLinks(BROKEN)
    const redirect = failures.find(f => f.kind === 'REDIRECT')
    assert.ok(redirect, 'expected a REDIRECT failure')
    assert.match(
        redirect.reason,
        /\/docs\/does-not-exist\/ resolves to no page/,
    )
})

test('legacy URL expansion emits both Docusaurus route shapes, custom-slug indexes in the newer shape only', () => {
    const urls = legacyDocusaurusUrls({
        pages: ['guide'],
        generatedIndexes: ['category/guides'],
        customSlugIndexes: ['quickstarts'],
    })
    assert.deepEqual(urls, [
        { path: '/documentation', slug: null },
        { path: '/documentation/guide', slug: 'guide' },
        { path: '/documentation/category/guides', slug: null },
        { path: '/documentation/quickstarts', slug: null },
        { path: '/documentation/docs', slug: null },
        { path: '/documentation/docs/guide', slug: 'guide' },
        { path: '/documentation/docs/category/guides', slug: null },
    ])
})

test('redirect simulation reproduces Next path matching for empty and prefix-sharing wildcards', () => {
    // Pinned against next@16.3.3's getPathMatch + prepareDestination.
    const { compiled, errors } = compileRedirects([
        { source: '/documentation/docs/:path*', destination: '/docs/:path*/' },
        { source: '/documentation/:path*', destination: '/docs/:path*/' },
    ])
    assert.deepEqual(errors, [])
    // An empty `:path*` drops its leading slash: `/docs/`, never `/docs//`.
    assert.deepEqual(resolveRedirect(compiled, '/documentation/docs/'), {
        hops: [{ source: '/documentation/docs/:path*', to: '/docs/' }],
        final: '/docs',
    })
    // A literal segment matches whole segments only: `docsx` is not `docs`.
    assert.equal(
        resolveRedirect(compiled, '/documentation/docsx').hops[0].source,
        '/documentation/:path*',
    )
    assert.equal(
        resolveRedirect(compiled, '/documentation/docs/a/b/').final,
        '/docs/a/b',
    )
})

test('a redirect source pattern the simulator cannot model is refused, not treated as a non-match', () => {
    const { compiled, errors } = compileRedirects([
        { source: '/documentation/:id(\\d+)', destination: '/docs/' },
    ])
    assert.equal(compiled.length, 0)
    assert.equal(errors.length, 1)
    assert.match(errors[0].reason, /not a supported pattern/)
})

test('an older-shape legacy URL swallowed by the newer-shape wildcard is reported as a doubled /docs/docs/ path', () => {
    const failures = legacyFailures(
        withLegacyConfig('legacy-doubled.config.txt'),
    )
    assert.deepEqual(
        failures.map(f => f.link.split(' -> ')[0]),
        [
            '/documentation/docs',
            '/documentation/docs/guide',
            '/documentation/docs/category/guides',
        ],
    )
    const guide = failures.find(f =>
        f.link.startsWith('/documentation/docs/guide'),
    )
    assert.match(
        guide.reason,
        /lands on \/docs\/docs\/guide\/, which is no page/,
    )
})

test('a legacy URL that reaches its page through two redirect rules fails the single-hop rule', () => {
    const failures = legacyFailures(
        withLegacyConfig('legacy-chained.config.txt'),
    )
    assert.equal(failures.length, 3)
    for (const f of failures) {
        assert.match(f.reason, /takes 2 redirect hops/)
    }
    assert.ok(
        failures.some(
            f =>
                f.link ===
                '/documentation/docs/guide -> /documentation/guide -> /docs/guide/',
        ),
        JSON.stringify(failures, null, 2),
    )
})

test('a legacy doc page sent to a fallback while its own page exists is reported', () => {
    const failures = legacyFailures(
        withLegacyConfig('legacy-collapsed.config.txt'),
    )
    assert.equal(failures.length, 1, JSON.stringify(failures, null, 2))
    assert.match(
        failures[0].reason,
        /\/documentation\/docs\/guide lands on \/docs, but its own page \/docs\/guide exists/,
    )
})

test('a legacy URL no redirect rule matches is reported as a LEGACY failure', () => {
    const failures = legacyFailures(BROKEN)
    assert.equal(failures.length, 6)
    for (const f of failures) {
        assert.match(f.reason, /matches no redirect rule/)
    }
})

test('the real next.config sends every legacy Docusaurus URL, both route shapes, to a real page in one hop', () => {
    const { failures, counts } = checkDocsLinks()
    const legacy = failures.filter(f => f.kind === 'LEGACY')
    assert.deepEqual(legacy, [], JSON.stringify(legacy, null, 2))
    assert.equal(
        counts.legacyUrlsChecked,
        legacyDocusaurusUrls(LEGACY_DOCUSAURUS).length,
    )
})

test('older-shape URLs still ranking in Search Console land on their exact current pages', () => {
    const compiled = realRedirects()
    const cases = [
        ['/documentation/docs', '/docs'],
        ['/documentation/docs/getting-started/', '/docs/getting-started'],
        ['/documentation/docs/error-handling/', '/docs/error-handling'],
        [
            '/documentation/docs/api-reference/upupuploader/icon-prop/',
            '/docs/api-reference/upupuploader/icon-prop',
        ],
        [
            '/documentation/docs/api-reference/upupuploader/event-handlers/',
            '/docs/api-reference/upupuploader/event-handlers',
        ],
        [
            '/documentation/docs/category/upupuploader/',
            '/docs/api-reference/upupuploader/required-props',
        ],
        [
            '/documentation/docs/category/api-reference/',
            '/docs/api-reference/s3-generate-presigned-url',
        ],
        [
            '/documentation/docs/migration/v2-to-v2.1/',
            '/docs/migration/v1-to-v3',
        ],
        // The newer shape keeps resolving exactly as before.
        ['/documentation/getting-started/', '/docs/getting-started'],
        [
            '/documentation/category/upupuploader/',
            '/docs/api-reference/upupuploader/required-props',
        ],
    ]
    for (const [legacy, expected] of cases) {
        const { hops, final } = resolveRedirect(compiled, legacy)
        assert.equal(final, expected, `${legacy} final page`)
        assert.equal(hops.length, 1, `${legacy} rule hops`)
    }
})
