// Self-tests for the sitemap page-lastmod snapshot generator and its gate
// (scripts/seo/page-lastmod.mjs, T-5788). Pure functions only: the git calls
// themselves are exercised by `pnpm run seo:lastmod:check` against the real
// history, in CI and in the pre-commit hook.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { todayUtc, utcCalendarDate } from './lastmod-date.mjs'
import {
    agentIdsFrom,
    discoverPages,
    docsRouteFor,
    frameworkIdsFrom,
    frameworkTabsTopicsIn,
    newestDateFor,
    parseLsTree,
    parsePorcelainZ,
    parseRawLog,
    snapshotProblems,
    touchesSources,
} from './page-lastmod.mjs'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const readRepo = rel => readFileSync(join(REPO_ROOT, rel), 'utf8')

const BLOB_A = 'a'.repeat(40)
const BLOB_B = 'b'.repeat(40)
const BLOB_C = 'c'.repeat(40)
const ZERO = '0'.repeat(40)

// ── UTC calendar dates ──────────────────────────────────────────────────────

test('a +01:00 commit just after local midnight is stamped with the previous UTC day', () => {
    assert.equal(utcCalendarDate('2026-09-26T00:03:00+01:00'), '2026-09-25')
})

test('the gate does not call that commit future while UTC is still on the previous day', () => {
    const committed = utcCalendarDate('2026-09-26T00:03:00+01:00')
    const gateToday = todayUtc(new Date('2026-09-25T23:05:00Z'))
    assert.equal(gateToday, '2026-09-25')
    assert.ok(
        committed <= gateToday,
        `${committed} must not be after ${gateToday}`,
    )
})

test('a commit made after UTC midnight from a negative offset is stamped with the next UTC day', () => {
    assert.equal(utcCalendarDate('2026-07-21T23:51:15-04:00'), '2026-07-22')
})

test('an unparseable git date throws instead of stamping a made-up date', () => {
    assert.throws(
        () => utcCalendarDate('not-a-date'),
        /cannot read a date from "not-a-date"/,
    )
})

// ── route discovery from the .ts modules, read as text ──────────────────────

test('framework ids come from FRAMEWORK_LIST in sitemap order, React first', () => {
    assert.deepEqual(
        frameworkIdsFrom(readRepo('apps/landing/src/lib/frameworks.tsx')),
        ['react', 'vue', 'svelte', 'angular', 'vanilla', 'preact'],
    )
})

test('framework id parsing throws when FRAMEWORK_LIST changes shape', () => {
    assert.throws(
        () => frameworkIdsFrom('export const FRAMEWORK_LIST = buildList()'),
        /no FRAMEWORK_LIST entries/,
    )
})

test('agent ids come from AGENTS even though an entry header contains brackets', () => {
    assert.deepEqual(
        agentIdsFrom(readRepo('apps/landing/src/lib/agent-setup/config.ts')),
        ['claude-code', 'codex', 'cursor', 'opencode'],
    )
})

test('agent id parsing throws when AGENTS changes shape', () => {
    assert.throws(
        () => agentIdsFrom('export const AGENTS = loadAgents()\n'),
        /no AGENTS entries/,
    )
})

test('docs index files are served at their folder URL', () => {
    assert.equal(docsRouteFor('index'), '/docs')
    assert.equal(docsRouteFor('guides/index'), '/docs/guides')
    assert.equal(
        docsRouteFor('guides/storage/aws-s3'),
        '/docs/guides/storage/aws-s3',
    )
})

test('FrameworkTabs topics are collected once each from an MDX page', () => {
    const mdx = [
        '<FrameworkTabs topic="getting-started" />',
        '<FrameworkTabs className="x" topic="server-mode" />',
        '<FrameworkTabs topic="getting-started" />',
    ].join('\n')
    assert.deepEqual(frameworkTabsTopicsIn(mdx), [
        'getting-started',
        'server-mode',
    ])
})

test('the real tree expands every sitemap template and maps docs snippets', () => {
    const pages = discoverPages()
    for (const route of [
        '/',
        '/react',
        '/preact',
        '/support',
        '/privacy',
        '/agent-setup',
        '/agent-setup/cursor',
        '/docs',
        '/docs/guides',
        '/docs/getting-started',
    ]) {
        assert.ok(pages.has(route), `${route} is discovered`)
    }
    assert.ok(
        !pages.has('/[framework]'),
        'templates are expanded, never listed',
    )
    assert.ok(!pages.has('/mobile-demo'), 'the demo harness is not sitemapped')
    assert.ok(
        pages
            .get('/docs/getting-started')
            .includes('apps/landing/content/docs/_snippets/getting-started'),
        'a FrameworkTabs embed dates the page by its snippet files too',
    )
    assert.ok(
        pages
            .get('/docs')
            .includes('apps/landing/src/components/docs/DocsHome.tsx'),
    )
})

// ── dirty-tree detection ────────────────────────────────────────────────────

test('porcelain -z output yields both sides of a rename plus untracked paths', () => {
    const output = [
        ' M apps/landing/src/app/privacy/page.tsx',
        'R  apps/landing/content/docs/new.mdx',
        'apps/landing/content/docs/old.mdx',
        '?? apps/landing/src/components/FAQSection/extra.tsx',
        '',
    ].join('\0')
    assert.deepEqual(parsePorcelainZ(output), [
        'apps/landing/src/app/privacy/page.tsx',
        'apps/landing/content/docs/new.mdx',
        'apps/landing/content/docs/old.mdx',
        'apps/landing/src/components/FAQSection/extra.tsx',
    ])
})

test('a source directory covers files under it but not a sibling sharing its prefix', () => {
    const sources = ['apps/landing/src/app/support']
    assert.equal(
        touchesSources(['apps/landing/src/app/support/page.tsx'], sources),
        true,
    )
    assert.equal(
        touchesSources(['apps/landing/src/app/support'], sources),
        true,
    )
    assert.equal(
        touchesSources(['apps/landing/src/app/support-v2/page.tsx'], sources),
        false,
    )
})

// ── one-walk history dating ─────────────────────────────────────────────────

test('ls-tree output maps each path to its HEAD blob', () => {
    const output = `100644 blob ${BLOB_A}\tapps/landing/content/docs/faq.mdx\n`
    assert.deepEqual(
        [...parseLsTree(output)],
        [['apps/landing/content/docs/faq.mdx', BLOB_A]],
    )
})

test('a side-branch edit that a merge dropped does not re-date the page', () => {
    const faq = 'apps/landing/content/docs/faq.mdx'
    const log = [
        '@@commit 2026-10-13T05:08:21-04:00',
        '',
        `:100644 100644 ${BLOB_A} ${BLOB_B} M\t${faq}`,
        '@@commit 2026-10-08T05:23:02-04:00',
        '',
        `:100644 100644 ${BLOB_C} ${BLOB_A} M\t${faq}`,
    ].join('\n')
    const { fileDates, ambiguous } = parseRawLog(log, new Map([[faq, BLOB_A]]))
    assert.equal(fileDates.get(faq), '2026-10-08')
    assert.deepEqual(ambiguous, [])
})

test('a merge that authored the content itself dates the page at the merge', () => {
    const page = 'apps/landing/content/docs/guides/reliability.mdx'
    const log = [
        '@@commit 2026-09-16T15:14:53-04:00',
        '',
        `::100644 100644 100644 ${BLOB_A} ${BLOB_B} ${BLOB_C} MM\t${page}`,
        '@@commit 2026-09-12T04:07:41+01:00',
        '',
        `:100644 100644 ${BLOB_B} ${BLOB_A} M\t${page}`,
    ].join('\n')
    const { fileDates } = parseRawLog(log, new Map([[page, BLOB_C]]))
    assert.equal(fileDates.get(page), '2026-09-16')
})

test('a file deleted from a source directory dates that directory at the deletion', () => {
    const gone = 'apps/landing/src/components/FAQSection/Legacy.tsx'
    const log = [
        '@@commit 2026-10-02T10:00:00Z',
        '',
        `:100644 000000 ${BLOB_A} ${ZERO} D\t${gone}`,
        '@@commit 2026-09-01T10:00:00Z',
        '',
        `:000000 100644 ${ZERO} ${BLOB_A} A\t${gone}`,
    ].join('\n')
    const { fileDates } = parseRawLog(log, new Map())
    assert.equal(fileDates.get(gone), '2026-10-02')
    assert.equal(
        newestDateFor(['apps/landing/src/components/FAQSection'], fileDates),
        '2026-10-02',
    )
})

test('the same content produced on two days is handed back to git as ambiguous', () => {
    const faq = 'apps/landing/content/docs/faq.mdx'
    const log = [
        '@@commit 2026-10-13T05:12:01-04:00',
        '',
        `:100644 100644 ${BLOB_B} ${BLOB_A} M\t${faq}`,
        '@@commit 2026-10-08T05:23:02-04:00',
        '',
        `:100644 100644 ${BLOB_C} ${BLOB_A} M\t${faq}`,
    ].join('\n')
    const { ambiguous } = parseRawLog(log, new Map([[faq, BLOB_A]]))
    assert.deepEqual(ambiguous, [faq])
})

test('a page takes the newest date among all files under its sources', () => {
    const fileDates = new Map([
        ['apps/landing/src/app/privacy/page.tsx', '2026-09-12'],
        ['apps/landing/src/lib/faqs.ts', '2026-10-20'],
        ['apps/landing/src/app/support/page.tsx', '2026-10-21'],
    ])
    assert.equal(
        newestDateFor(
            ['apps/landing/src/app/privacy', 'apps/landing/src/lib/faqs.ts'],
            fileDates,
        ),
        '2026-10-20',
    )
    assert.equal(
        newestDateFor(['apps/landing/src/app/agent-setup'], fileDates),
        null,
    )
})

// ── the gate's verdict ──────────────────────────────────────────────────────

const TODAY = '2026-10-22'

test('a snapshot matching the sitemap with sane dates has no problems', () => {
    assert.deepEqual(
        snapshotProblems({
            committed: { '/': '2026-10-21', '/docs': '2026-10-20' },
            expected: ['/', '/docs'],
            today: TODAY,
            fresh: { '/': '2026-10-21', '/docs': '2026-10-20' },
        }),
        [],
    )
})

test('a sitemapped page without an entry and an entry without a page both fail', () => {
    assert.deepEqual(
        snapshotProblems({
            committed: { '/': '2026-10-21', '/docs/removed': '2026-10-01' },
            expected: ['/', '/docs/new-page'],
            today: TODAY,
        }),
        [
            'missing entry for /docs/new-page',
            'orphaned entry /docs/removed (no such page)',
        ],
    )
})

test('impossible, malformed and future dates fail', () => {
    assert.deepEqual(
        snapshotProblems({
            committed: {
                '/a': '2026-02-30',
                '/b': '22/10/2026',
                '/c': '2026-10-23',
            },
            expected: ['/a', '/b', '/c'],
            today: TODAY,
        }),
        [
            '/a: "2026-02-30" is not a YYYY-MM-DD date',
            '/b: "22/10/2026" is not a YYYY-MM-DD date',
            '/c: 2026-10-23 is in the future',
        ],
    )
})

test('an entry more than a day older than git fails; a one-day lag is tolerated', () => {
    assert.deepEqual(
        snapshotProblems({
            committed: { '/stale': '2026-10-18', '/close': '2026-10-20' },
            expected: ['/close', '/stale'],
            today: TODAY,
            fresh: { '/stale': '2026-10-20', '/close': '2026-10-21' },
        }),
        [
            '/stale: snapshot says 2026-10-18, git says 2026-10-20 — run `pnpm run seo:lastmod`',
        ],
    )
})

test('without history (shallow clone) the staleness comparison is skipped', () => {
    assert.deepEqual(
        snapshotProblems({
            committed: { '/stale': '2026-01-01' },
            expected: ['/stale'],
            today: TODAY,
        }),
        [],
    )
})
