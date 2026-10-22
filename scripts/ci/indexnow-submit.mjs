#!/usr/bin/env node
// Daily IndexNow discovery for useupup.com (T-5788, ported from DoDomain/Uptimely).
// node scripts/ci/indexnow-submit.mjs --dry-run [--all]
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
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

const ENDPOINT = 'https://api.indexnow.org/indexnow'

// The landing app owns both values: INDEXNOW_KEY in src/lib/indexnow.ts (its
// route directory is named after it) and DEFAULT_SITE_URL in src/lib/site-url.ts.
// CI runs Node 20 (.nvmrc), which cannot import TypeScript, so read the two
// declarations as text (LF or a Windows checkout's CRLF). Exactly one strict
// match each, or the run fails: a refactor that changes either line must
// update this reader, never guess.
const LANDING_SOURCES = {
    key: {
        file: 'apps/landing/src/lib/indexnow.ts',
        pattern: /^export const INDEXNOW_KEY = '([0-9a-f]{32})'\r?$/gm,
    },
    siteUrl: {
        file: 'apps/landing/src/lib/site-url.ts',
        pattern: /^const DEFAULT_SITE_URL = '(https:\/\/[^'/]+)'\r?$/gm,
    },
}

/** @param {(file: string) => string} readSource */
export function readLandingIndexNowConfig(
    readSource = file =>
        readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'),
) {
    const value = name => {
        const { file, pattern } = LANDING_SOURCES[name]
        const matches = [...readSource(file).matchAll(pattern)]
        if (matches.length !== 1) {
            throw new Error(
                `${file}: expected one ${pattern} declaration, found ${matches.length}`,
            )
        }
        return matches[0][1]
    }
    return { key: value('key'), siteOrigin: value('siteUrl') }
}

/**
 * The injected HTTP boundary lets node:test exercise the complete run without
 * submitting fixtures to a search engine. The CLI uses native fetch and the
 * landing app's own key and origin.
 * @param {{argv?: string[], now?: Date, fetchImpl?: typeof fetch, log?: (message: string) => void, key?: string, siteOrigin?: string}} options
 */
export async function runIndexNow({
    argv = [],
    now = new Date(),
    fetchImpl = fetch,
    log = console.log,
    key,
    siteOrigin,
} = {}) {
    const args = parseArgs(argv)
    if (key === undefined || siteOrigin === undefined) {
        ;({ key, siteOrigin } = readLandingIndexNowConfig())
    }
    const host = new URL(siteOrigin).host
    const keyLocation = `${siteOrigin}/${key}.txt`

    async function request(url, options = {}) {
        try {
            const response = await fetchImpl(url, {
                ...options,
                redirect: 'manual',
                signal: AbortSignal.timeout(30_000),
            })
            return { status: response.status, body: await response.text() }
        } catch (error) {
            throw new Error(`request failed at ${url}: ${error}`, {
                cause: error,
            })
        }
    }

    async function getText(url) {
        const response = await request(url)
        if (response.status !== 200) {
            throw new Error(
                `fetch: HTTP ${response.status} at ${url} (expected 200)`,
            )
        }
        return response.body
    }

    // Check even when no URLs changed or this is a dry run.
    const keyFile = await request(keyLocation)
    const keyProblem = keyFileFailure(keyFile.status, keyFile.body, key)
    if (keyProblem) throw new Error(`${keyLocation}: ${keyProblem}`)
    log('indexnow: key file verified (HTTP 200, matching body)')

    const robots = await getText(`${siteOrigin}/robots.txt`)
    const queue = robotsSitemaps(robots, host, log)
    const seen = new Set(queue)
    let childCount = 0
    /** @type {import('./indexnow-verdict.mjs').SitemapEntry[]} */
    const entries = []
    for (const sitemapUrl of queue) {
        const xml = await getText(sitemapUrl)
        let document
        try {
            document = sitemapDocument(xml)
        } catch (error) {
            throw new Error(`invalid sitemap at ${sitemapUrl}: ${error}`, {
                cause: error,
            })
        }
        for (const child of sameHostUrls(document.children, host, log)) {
            if (seen.has(child)) continue
            if (++childCount > 50) {
                throw new Error(
                    'sitemap index exceeds the limit of 50 unique same-host children',
                )
            }
            seen.add(child)
            queue.push(child)
        }
        const allowed = new Set(
            sameHostUrls(
                document.entries.map(entry => entry.loc),
                host,
                log,
            ),
        )
        entries.push(
            ...document.entries.filter(entry => allowed.has(entry.loc)),
        )
        log(
            `indexnow: ${sitemapUrl}: ${allowed.size} same-host URLs, ${document.children.length} children`,
        )
    }

    const urlList = selectUrls(entries, {
        now,
        windowHours: args.windowHours,
        all: args.all,
    })
    log(
        `indexnow: ${urlList.length}/${entries.length} sitemap URLs selected (${args.all ? 'all' : `lastmod within ${args.windowHours}h`})`,
    )
    if (args.dryRun) {
        for (const url of urlList) log(`  ${url}`)
        log('indexnow: dry run, nothing submitted')
        return
    }
    if (urlList.length === 0) {
        log('indexnow: nothing changed in the window, nothing to submit')
        return
    }
    const batches = chunkUrls(urlList)
    for (const [index, batch] of batches.entries()) {
        const response = await request(ENDPOINT, {
            method: 'POST',
            headers: { 'content-type': 'application/json; charset=utf-8' },
            body: JSON.stringify(
                buildPayload({ host, key, keyLocation, urlList: batch }),
            ),
        })
        const problem = responseFailure(response.status, response.body)
        if (problem)
            throw new Error(`batch ${index + 1}/${batches.length}: ${problem}`)
        log(
            `indexnow: submitted ${batch.length} URLs (batch ${index + 1}/${batches.length}), HTTP ${response.status}`,
        )
    }
}

if (
    process.argv[1] &&
    pathToFileURL(process.argv[1]).href === import.meta.url
) {
    runIndexNow({ argv: process.argv.slice(2) }).catch(error => {
        console.error(`indexnow-submit FAILED: ${error.message}`)
        process.exitCode = 1
    })
}
