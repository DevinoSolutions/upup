// Dependency-free sitemap and IndexNow decisions, ported from DoDomain.
// The CLI owns HTTP; these helpers run in `pnpm run test:scripts` (node:test).

/** @typedef {{ loc: string, lastmod: Date | null }} SitemapEntry */

/** @param {string[]} argv */
export function parseArgs(argv) {
    const args = { all: false, dryRun: false, windowHours: 48 }
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i]
        if (arg === '--all') args.all = true
        else if (arg === '--dry-run') args.dryRun = true
        else if (arg === '--window-hours') {
            args.windowHours = Number(argv[++i])
            if (!Number.isFinite(args.windowHours) || args.windowHours <= 0) {
                throw new Error('--window-hours needs a positive number')
            }
        } else throw new Error(`unknown argument: ${arg}`)
    }
    return args
}

/** @param {string} value */
function httpUrl(value) {
    const url = new URL(value)
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) {
        throw new Error(`expected an HTTP(S) URL without credentials: ${value}`)
    }
    return url
}

/** @param {string[]} urls @param {string} host @param {(message: string) => void} log */
export function sameHostUrls(urls, host, log) {
    return urls.filter(value => {
        if (httpUrl(value).host === host) return true
        log(`indexnow: skipping off-host URL ${value}`)
        return false
    })
}

/** @param {string} robots @param {string} host @param {(message: string) => void} log */
export function robotsSitemaps(robots, host, log) {
    const urls = [...robots.matchAll(/^\s*Sitemap:\s*(\S+)/gim)].map(
        match => match[1],
    )
    const roots = [...new Set(sameHostUrls(urls, host, log))]
    if (roots.length === 0) {
        throw new Error(`robots.txt lists no same-host sitemaps for ${host}`)
    }
    return roots
}

/** Read the sitemap vocabulary, including namespace prefixes and attributes. */
function blocks(xml, tag, prefix) {
    const name = `${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${tag}`
    const matches = [
        ...xml.matchAll(
            new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}\\s*>`, 'g'),
        ),
    ]
    const openings = [...xml.matchAll(new RegExp(`<${name}\\b`, 'g'))]
    if (matches.length !== openings.length) {
        throw new Error(`malformed sitemap <${tag}> element`)
    }
    return matches.map(match => match[1])
}

function xmlText(value) {
    const cdata = /^<!\[CDATA\[([\s\S]*)\]\]>$/.exec(value.trim())
    if (cdata) return cdata[1].trim()
    if (value.includes('<'))
        throw new Error('unexpected markup in sitemap value')
    const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
    return value.trim().replace(/&([^;\s]+);/g, (_, entity) => {
        if (Object.hasOwn(entities, entity)) return entities[entity]
        if (/^#x[\da-f]+$/i.test(entity)) {
            return String.fromCodePoint(parseInt(entity.slice(2), 16))
        }
        if (/^#\d+$/.test(entity))
            return String.fromCodePoint(Number(entity.slice(1)))
        throw new Error(`unknown XML entity: &${entity};`)
    })
}

/** @param {string} xml @returns {{ children: string[], entries: SitemapEntry[] }} */
export function sitemapDocument(xml) {
    const document = xml
        .replace(/<!--[\s\S]*?-->/g, '')
        .trim()
        .replace(/^<\?xml[\s\S]*?\?>\s*/, '')
    const root =
        /^<((?:[\w.-]+:)?(?:urlset|sitemapindex))\b[^>]*>([\s\S]*)<\/\1\s*>$/.exec(
            document,
        )
    if (!root) throw new Error('expected a complete <urlset> or <sitemapindex>')
    const isIndex = root[1].endsWith('sitemapindex')
    const prefix = root[1].replace(/(?:urlset|sitemapindex)$/, '')
    const rows = blocks(root[2], isIndex ? 'sitemap' : 'url', prefix)
    if (rows.length === 0) throw new Error('sitemap contains no entries')
    const entries = rows.map(row => {
        const locations = blocks(row, 'loc', prefix)
        if (locations.length !== 1)
            throw new Error('sitemap entry needs one <loc>')
        const loc = xmlText(locations[0])
        httpUrl(loc)
        const raw = blocks(row, 'lastmod', prefix)[0]
        const date = raw ? new Date(xmlText(raw)) : null
        return {
            loc,
            lastmod: date && Number.isFinite(date.getTime()) ? date : null,
        }
    })
    return isIndex
        ? { children: entries.map(entry => entry.loc), entries: [] }
        : { children: [], entries }
}

/**
 * Undated/invalid dates cannot prove a page unchanged, so resubmit them.
 * Deduplicate AFTER selection: a newer duplicate must not be hidden by an old one.
 * @param {SitemapEntry[]} entries
 * @param {{now: Date, windowHours: number, all: boolean}} options
 */
export function selectUrls(entries, { now, windowHours, all }) {
    const cutoff = now.getTime() - windowHours * 3_600_000
    /** @type {Map<string, string>} */
    const selected = new Map()
    for (const entry of entries) {
        if (
            all ||
            entry.lastmod === null ||
            entry.lastmod.getTime() >= cutoff
        ) {
            const identity = httpUrl(entry.loc).href
            if (!selected.has(identity)) selected.set(identity, entry.loc)
        }
    }
    return [...selected.values()]
}

/** @param {string[]} urls @returns {string[][]} */
export function chunkUrls(urls) {
    const chunks = []
    for (let offset = 0; offset < urls.length; offset += 10_000) {
        chunks.push(urls.slice(offset, offset + 10_000))
    }
    return chunks
}

/** @param {{host: string, key: string, keyLocation: string, urlList: string[]}} payload */
export function buildPayload(payload) {
    if (payload.urlList.length === 0 || payload.urlList.length > 10_000) {
        throw new Error('IndexNow batches require 1 to 10,000 URLs')
    }
    for (const url of [...payload.urlList, payload.keyLocation]) {
        if (httpUrl(url).host !== payload.host) {
            throw new Error(
                `IndexNow payload URL is off ${payload.host}: ${url}`,
            )
        }
    }
    return payload
}

/** IndexNow 202 means received, with key validation still pending. */
export function responseFailure(status, body) {
    if (status === 200 || status === 202) return null
    return `IndexNow answered HTTP ${status} (expected 200/202): ${String(body).slice(0, 300)}`
}

export function keyFileFailure(status, body, key) {
    if (status !== 200) return `key file answered HTTP ${status} (expected 200)`
    if (body.trim() !== key) return 'key file body does not equal INDEXNOW_KEY'
    return null
}
