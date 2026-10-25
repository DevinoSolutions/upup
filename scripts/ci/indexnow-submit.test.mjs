import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readLandingIndexNowConfig, runIndexNow } from './indexnow-submit.mjs'
import {
    buildPayload,
    chunkUrls,
    keyFileFailure,
    parseArgs,
    responseFailure,
    robotsSitemaps,
    sameHostUrls,
    selectUrls,
    sitemapDocument,
} from './indexnow-verdict.mjs'

// The fixtures use the landing app's real key and origin, so these cases also
// prove the CLI's text reader still finds both declarations.
const { key: KEY, siteOrigin: SITE_ORIGIN } = readLandingIndexNowConfig()
const host = new URL(SITE_ORIGIN).host
const keyLocation = `${SITE_ORIGIN}/${KEY}.txt`
const root = `${SITE_ORIGIN}/sitemap.xml`
const now = new Date('2026-10-22T12:00:00Z')
const urlset = (...urls) =>
    `<urlset>${urls.map(url => `<url><loc>${url}</loc></url>`).join('')}</urlset>`
const sitemapIndex = (...urls) =>
    `<sitemapindex>${urls.map(url => `<sitemap><loc>${url}</loc></sitemap>`).join('')}</sitemapindex>`

function recorder() {
    const messages = []
    const log = message => messages.push(message)
    return { messages, log }
}

/** @param {Record<string, string | {status: number, body?: string} | Error>} overrides */
function fixture(overrides = {}, statuses = [200]) {
    const replies = {
        [keyLocation]: `${KEY}\n`,
        [`${SITE_ORIGIN}/robots.txt`]: `Sitemap: ${root}`,
        [root]: urlset(`${SITE_ORIGIN}/`),
        ...overrides,
    }
    const posts = []
    const calls = []
    const { messages, log } = recorder()
    const fetchImpl = async (input, options) => {
        const url = String(input)
        calls.push([url, options])
        if (options?.method === 'POST') {
            assert.equal(url, 'https://api.indexnow.org/indexnow')
            posts.push(JSON.parse(String(options.body)))
            return new Response('fixture verdict', {
                status: statuses[posts.length - 1] ?? 200,
            })
        }
        const reply = replies[url]
        if (reply === undefined)
            throw new Error(`unexpected fixture request: ${url}`)
        if (reply instanceof Error) throw reply
        return new Response(
            typeof reply === 'string' ? reply : (reply.body ?? ''),
            { status: typeof reply === 'string' ? 200 : reply.status },
        )
    }
    return {
        posts,
        calls,
        messages,
        run: (argv = []) =>
            runIndexNow({
                argv,
                now,
                fetchImpl,
                log,
                key: KEY,
                siteOrigin: SITE_ORIGIN,
            }),
    }
}

test('reads the landing key and origin, and the key route directory exists', () => {
    assert.match(KEY, /^[0-9a-f]{32}$/)
    assert.equal(SITE_ORIGIN, 'https://useupup.com')
    assert.ok(
        existsSync(
            new URL(
                `../../apps/landing/src/app/${KEY}.txt/route.ts`,
                import.meta.url,
            ),
        ),
    )
})

const landingSources = (key, url) => file =>
    file.endsWith('indexnow.ts') ? key : url

test('refuses a landing source whose declaration is missing or duplicated', () => {
    const indexnow =
        "export const INDEXNOW_KEY = '5cb30cbda540958e8d033652400e59e3'"
    const site = "const DEFAULT_SITE_URL = 'https://useupup.com'"
    for (const [key, url] of [
        [indexnow, site],
        [`// a Windows checkout\r\n${indexnow}\r\n`, `${site}\r\n`],
    ]) {
        assert.deepEqual(readLandingIndexNowConfig(landingSources(key, url)), {
            key: '5cb30cbda540958e8d033652400e59e3',
            siteOrigin: 'https://useupup.com',
        })
    }
    for (const [key, url] of [
        ['export const INDEXNOW_KEY = process.env.KEY', site],
        [`${indexnow}\n${indexnow}`, site],
        [indexnow, "const DEFAULT_SITE_URL = 'https://useupup.com/'"],
    ]) {
        assert.throws(
            () => readLandingIndexNowConfig(landingSources(key, url)),
            /expected one/,
        )
    }
})

test('defaults to 48 hours and rejects invalid CLI arguments', () => {
    assert.deepEqual(parseArgs([]), {
        all: false,
        dryRun: false,
        windowHours: 48,
    })
    assert.deepEqual(
        parseArgs(['--all', '--dry-run', '--window-hours', '24']),
        { all: true, dryRun: true, windowHours: 24 },
    )
    for (const argv of [
        ['--unknown'],
        ['--window-hours'],
        ['--window-hours', '0'],
    ]) {
        assert.throws(() => parseArgs(argv))
    }
})

test('discovers every same-host robots sitemap once and logs off-host ones', () => {
    const { messages, log } = recorder()
    assert.deepEqual(
        robotsSitemaps(
            `User-agent: *\n Sitemap: ${root}\nSITEMAP: ${SITE_ORIGIN}/docs/sitemap.xml\nSitemap: ${root}\nSitemap: https://docs.${host}/sitemap.xml`,
            host,
            log,
        ),
        [root, `${SITE_ORIGIN}/docs/sitemap.xml`],
    )
    assert.ok(messages.some(message => message.includes('skipping off-host')))
    assert.throws(
        () => robotsSitemaps('User-agent: *', host, log),
        /no same-host sitemaps/,
    )
})

test('skips subdomains lookalike hosts and alternate ports with a log', () => {
    const { messages, log } = recorder()
    assert.deepEqual(
        sameHostUrls(
            [
                SITE_ORIGIN,
                `https://docs.${host}/`,
                `https://${host}.example/`,
                `${SITE_ORIGIN}:444/`,
            ],
            host,
            log,
        ),
        [SITE_ORIGIN],
    )
    assert.equal(messages.length, 3)
    for (const value of [
        `ftp://${host}/`,
        `https://user@${host}/`,
        'not a URL',
    ]) {
        assert.throws(() => sameHostUrls([value], host, log))
    }
})

test('reads namespaces CDATA XML entities and invalid dates conservatively', () => {
    const document = sitemapDocument(`<?xml version="1.0"?>
      <sm:urlset xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9">
        <!-- ignored -->
        <sm:url><sm:loc>${SITE_ORIGIN}/?a=1&amp;b=&#50;&#x33;</sm:loc><sm:lastmod>2026-10-22T08:00:00-04:00</sm:lastmod></sm:url>
        <sm:url><sm:loc><![CDATA[${SITE_ORIGIN}/docs?a=1&b=2]]></sm:loc><sm:lastmod>invalid</sm:lastmod></sm:url>
      </sm:urlset>`)
    assert.deepEqual(document, {
        children: [],
        entries: [
            { loc: `${SITE_ORIGIN}/?a=1&b=23`, lastmod: now },
            { loc: `${SITE_ORIGIN}/docs?a=1&b=2`, lastmod: null },
        ],
    })
    assert.deepEqual(sitemapDocument(sitemapIndex(root)).children, [root])
})

test('rejects a malformed sitemap instead of treating it as no changes', () => {
    for (const xml of [
        '<html>upstream error</html>',
        '<urlset><url><loc>https://example.com/</url></urlset>',
        '<urlset><url></url></urlset>',
        `<urlset><url><loc>${SITE_ORIGIN}/?a=&unknown;</loc></url></urlset>`,
    ]) {
        assert.throws(() => sitemapDocument(xml))
    }
})

test('keeps page locations separate from image sitemap extension locations', () => {
    const document =
        sitemapDocument(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
      <url><loc>${SITE_ORIGIN}/page</loc><image:image><image:loc>${SITE_ORIGIN}/image.jpg</image:loc></image:image></url>
    </urlset>`)
    assert.deepEqual(document.entries, [
        { loc: `${SITE_ORIGIN}/page`, lastmod: null },
    ])
})

test('includes the cutoff undated and newer duplicates while all overrides age', () => {
    const entries = [
        {
            loc: `${SITE_ORIGIN}/old`,
            lastmod: new Date('2026-10-20T11:59:59.999Z'),
        },
        {
            loc: `${SITE_ORIGIN}/cutoff`,
            lastmod: new Date('2026-10-20T12:00:00Z'),
        },
        { loc: `${SITE_ORIGIN}/undated`, lastmod: null },
        { loc: `${SITE_ORIGIN}/old`, lastmod: now },
    ]
    assert.deepEqual(
        selectUrls(entries, { now, windowHours: 48, all: false }),
        [
            `${SITE_ORIGIN}/cutoff`,
            `${SITE_ORIGIN}/undated`,
            `${SITE_ORIGIN}/old`,
        ],
    )
    assert.deepEqual(
        selectUrls(entries.slice(0, 1), { now, windowHours: 48, all: true }),
        [`${SITE_ORIGIN}/old`],
    )
})

test('chunks at 10000 and rejects empty oversized or foreign payloads', () => {
    const urls = Array.from({ length: 10_001 }, (_, i) => `${SITE_ORIGIN}/${i}`)
    assert.deepEqual(chunkUrls([]), [])
    assert.deepEqual(
        chunkUrls(urls).map(batch => batch.length),
        [10_000, 1],
    )
    const payload = { host, key: KEY, keyLocation, urlList: [SITE_ORIGIN] }
    assert.deepEqual(buildPayload(payload), payload)
    for (const urlList of [[], urls, ['https://example.com/']]) {
        assert.throws(() => buildPayload({ ...payload, urlList }))
    }
    assert.throws(() =>
        buildPayload({
            ...payload,
            keyLocation: 'https://example.com/key.txt',
        }),
    )
})

test('accepts only 200 or 202 submission verdicts and exact key contents', () => {
    assert.equal(responseFailure(200, ''), null)
    assert.equal(responseFailure(202, 'pending validation'), null)
    for (const status of [204, 301, 400, 403, 422, 429, 500]) {
        assert.match(
            responseFailure(status, 'failure'),
            new RegExp(`HTTP ${status}`),
        )
    }
    assert.equal(keyFileFailure(200, `${KEY}\n`, KEY), null)
    assert.match(keyFileFailure(202, KEY, KEY), /HTTP 202/)
    assert.match(keyFileFailure(200, 'wrong-key', KEY), /does not equal/)
})

test('walks all robots roots and nested indexes once without submitting foreign URLs', async () => {
    const docs = `${SITE_ORIGIN}/docs/sitemap.xml`
    const nested = `${SITE_ORIGIN}/nested.xml`
    const leaf = `${SITE_ORIGIN}/leaf.xml`
    const foreign = `https://docs.${host}/sitemap.xml`
    const run = fixture({
        [`${SITE_ORIGIN}/robots.txt`]: `Sitemap: ${root}\nSitemap: ${docs}\nSitemap: ${foreign}`,
        [root]: sitemapIndex(nested, docs, foreign),
        [docs]: urlset(`${SITE_ORIGIN}/docs/guide`),
        [nested]: sitemapIndex(root, nested, leaf, leaf),
        [leaf]: urlset(
            `${SITE_ORIGIN}/`,
            `${SITE_ORIGIN}/docs/guide`,
            'https://example.com/',
        ),
    })
    await run.run()
    assert.deepEqual(run.posts, [
        {
            host,
            key: KEY,
            keyLocation,
            urlList: [`${SITE_ORIGIN}/docs/guide`, `${SITE_ORIGIN}/`],
        },
    ])
    const fetched = run.calls.map(([url]) => url)
    assert.deepEqual(
        fetched.filter(url => url === root || url === nested || url === leaf),
        [root, nested, leaf],
    )
    assert.ok(!fetched.includes(foreign))
    assert.ok(
        run.messages.some(message =>
            message.includes('skipping off-host URL https://example.com/'),
        ),
    )
})

for (const count of [50, 51]) {
    test(`enforces the child-fetch cap at ${count} unique same-host children`, async () => {
        const children = Array.from(
            { length: count },
            (_, i) => `${SITE_ORIGIN}/child-${i}.xml`,
        )
        const replies = Object.fromEntries(
            children.map((url, i) => [url, urlset(`${SITE_ORIGIN}/page-${i}`)]),
        )
        const run = fixture({
            ...replies,
            [root]: sitemapIndex(...children, children[0]),
        })
        if (count === 50) {
            await run.run(['--dry-run'])
            assert.equal(run.calls.length, 53)
        } else {
            await assert.rejects(run.run(), /50 unique same-host children/)
        }
        assert.equal(run.posts.length, 0)
    })
}

test('dry-run verifies the key and prints selected URLs without any POST', async () => {
    const run = fixture()
    await run.run(['--dry-run'])
    assert.equal(run.calls[0][0], keyLocation)
    assert.ok(run.messages.includes(`  ${SITE_ORIGIN}/`))
    assert.ok(
        run.messages.includes(
            'indexnow: key file verified (HTTP 200, matching body)',
        ),
    )
    assert.equal(run.posts.length, 0)
})

for (const argv of [[], ['--dry-run']]) {
    test(`refuses an invalid hosted key before discovery with arguments [${argv}]`, async () => {
        for (const reply of [
            'incorrect-key',
            { status: 404 },
            { status: 302 },
        ]) {
            const run = fixture({ [keyLocation]: reply })
            await assert.rejects(run.run(argv), /key file/)
            assert.equal(run.calls.length, 1)
            assert.equal(run.posts.length, 0)
        }
    })
}

test('submits nothing when all dates are old unless all is requested', async () => {
    const xml = `<urlset><url><loc>${SITE_ORIGIN}/old</loc><lastmod>2026-01-01</lastmod></url></urlset>`
    const run = fixture({ [root]: xml })
    await run.run()
    assert.equal(run.posts.length, 0)
    await run.run(['--all'])
    assert.deepEqual(run.posts[0].urlList, [`${SITE_ORIGIN}/old`])
})

for (const status of [202, 500]) {
    test(`sends 10001 URLs in two batches and preserves the second HTTP ${status} verdict`, async () => {
        const urls = Array.from(
            { length: 10_001 },
            (_, i) => `${SITE_ORIGIN}/page-${i}`,
        )
        const run = fixture({ [root]: urlset(...urls) }, [200, status])
        if (status === 202) await run.run()
        else
            await assert.rejects(
                run.run(),
                /batch 2\/2: IndexNow answered HTTP 500/,
            )
        assert.deepEqual(
            run.posts.map(payload => payload.urlList.length),
            [10_000, 1],
        )
        assert.deepEqual(
            run.posts.flatMap(payload => payload.urlList),
            urls,
        )
    })
}

test('fails on redirects or request errors without following or submitting', async () => {
    for (const reply of [{ status: 302 }, new Error('connection failed')]) {
        const run = fixture({ [`${SITE_ORIGIN}/robots.txt`]: reply })
        await assert.rejects(
            run.run(),
            /HTTP 302|request failed.*connection failed/,
        )
        assert.equal(run.posts.length, 0)
        for (const [, options] of run.calls) {
            assert.equal(options.redirect, 'manual')
            assert.ok(options.signal instanceof AbortSignal)
        }
    }
})
