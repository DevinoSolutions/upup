#!/usr/bin/env node

/**
 * Docs API-surface sync gate (Phase 2).
 *
 * Usage:
 *   node scripts/docs/check-api-sync.mjs           (CHECK — default; CI gate)
 *   node scripts/docs/check-api-sync.mjs --write    (regenerate map + exceptions)
 *
 * Keeps the docs honest against the public API. The authoritative public
 * surface is derived — never hand-listed here — from two sources that already
 * gate every package:
 *   1. Each of the nine @upupjs/* packages' public-api pin test (the
 *      checked-in EXPECTED_*_EXPORTS array). @upupjs/preact re-exports react
 *      wholesale (its pin asserts equality, no independent array), so it is
 *      recorded as a mirror and contributes no members of its own.
 *   2. The @upupjs/core "contracts" types the UpupUploader is configured and
 *      observed through: the props type UploaderBaseProps and the core
 *      event-map CoreEvents, enumerated from the SOURCE .ts via the TypeScript
 *      compiler API (not dist, not regex).
 *
 * Gate semantics (all three fail the run, non-zero exit):
 *   - every surface member is either MAPPED to a docs page that EXISTS and whose
 *     text CONTAINS the member name, or EXCEPTED with an honest reason. A member
 *     that is neither is a new public API shipped without docs.
 *   - every map entry still names a member that exists in the surface (a ghost
 *     mapping — docs pointing at removed API — is red).
 *   - every exception still names a real, still-undocumented member (a stale
 *     exception is red — inverse-forced, self-liquidating, exactly like
 *     check-retired-vocab.mjs / the test-quality guard's KNOWN_EXCEPTIONS).
 *
 * --write regenerates api-docs-map.json + api-sync-exceptions.json from the
 * live surface + docs using the SAME matcher the check uses, so the two can
 * never drift. The CHECK is the default; --write is a convenience.
 */

import { createRequire } from 'node:module'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..', '..')
const DOCS_ROOT = 'apps/landing/content/docs'
const MAP_PATH = join(HERE, 'api-docs-map.json')
const EXCEPTIONS_PATH = join(HERE, 'api-sync-exceptions.json')

// The TypeScript compiler is a devDependency of @upupjs/core, not the root —
// resolve it from core's require context so this works under pnpm's hoisting.
const require = createRequire(
    join(REPO_ROOT, 'packages', 'core', 'package.json'),
)
const ts = require('typescript')

// ── Public surface: the nine packages' pin tests ─────────────────────────

// key → pin-test file (repo-relative). @upupjs/preact mirrors react (no array).
const PIN_TESTS = {
    '@upupjs/core': 'packages/core/tests/public-api.test.ts',
    '@upupjs/react': 'packages/react/tests/public-api.test.ts',
    '@upupjs/vue': 'packages/vue/tests/public-api.test.ts',
    '@upupjs/svelte': 'packages/svelte/tests/public-api.test.ts',
    '@upupjs/vanilla': 'packages/vanilla/tests/public-api.test.ts',
    '@upupjs/angular': 'packages/angular/src/public-api.spec.ts',
    '@upupjs/server': 'packages/server/tests/public-api.test.ts',
    '@upupjs/next/server': 'packages/next/src/__tests__/public-api.spec.ts',
    '@upupjs/preact': 'packages/preact/src/public-api.spec.ts',
}

/**
 * Parse the checked-in export-name arrays from one pin test. Robust: walks the
 * AST for `const EXPECTED_*_EXPORTS = [ ...string literals ]` (optionally
 * `.sort()`-chained), so ordering/formatting/`: string[]` annotations don't
 * matter. Returns { arrays: {NAME: string[]}, mirrorsReact: boolean }.
 */
export function extractPinnedArrays(text, fileName = 'pin.ts') {
    const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true)
    const arrays = {}
    const walk = node => {
        if (
            ts.isVariableDeclaration(node) &&
            ts.isIdentifier(node.name) &&
            /^EXPECTED_[A-Z_]*EXPORTS$/.test(node.name.text) &&
            node.initializer
        ) {
            let init = node.initializer
            // unwrap `[ ... ].sort()`
            if (
                ts.isCallExpression(init) &&
                ts.isPropertyAccessExpression(init.expression)
            ) {
                init = init.expression.expression
            }
            if (ts.isArrayLiteralExpression(init)) {
                arrays[node.name.text] = init.elements
                    .filter(ts.isStringLiteral)
                    .map(e => e.text)
            }
        }
        node.forEachChild(walk)
    }
    walk(sf)
    // preact/next-client define their surface as `export * from '@upupjs/react'`
    // and pin it by asserting equality with a `reactPkg` import.
    const mirrorsReact = /reactPkg/.test(text)
    return { arrays, mirrorsReact }
}

// ── Contracts types: UpupUploader props + core event-map ─────────────────

// Authoritative type names, chosen by reading packages/core/src (the ./contracts
// re-export tree + ./internal): UploaderBaseProps is the shared UpupUploader
// props/config shape every framework extends; CoreEvents is the core event map
// (its keys are the emitted event names).
const CONTRACT_TYPES = [
    {
        key: 'contracts:UploaderBaseProps',
        file: 'packages/core/src/types/uploader-props.ts',
        type: 'UploaderBaseProps',
    },
    {
        key: 'contracts:CoreEvents',
        file: 'packages/core/src/types/core-events.ts',
        type: 'CoreEvents',
    },
]

/** Enumerate the member names of an interface / type-literal alias by name. */
export function extractTypeMembers(text, typeName, fileName = 'contract.ts') {
    const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true)
    let decl = null
    const find = node => {
        if (decl) return
        if (
            (ts.isInterfaceDeclaration(node) ||
                ts.isTypeAliasDeclaration(node)) &&
            node.name.text === typeName
        ) {
            decl = node
            return
        }
        node.forEachChild(find)
    }
    find(sf)
    if (!decl) throw new Error(`type ${typeName} not found in ${fileName}`)
    let memberNodes = []
    if (ts.isInterfaceDeclaration(decl)) memberNodes = decl.members
    else if (ts.isTypeLiteralNode(decl.type)) memberNodes = decl.type.members
    const names = []
    for (const m of memberNodes) {
        if (!m.name) continue
        if (ts.isStringLiteral(m.name)) names.push(m.name.text)
        else if (ts.isIdentifier(m.name)) names.push(m.name.text)
        else names.push(m.name.getText(sf))
    }
    return names
}

/**
 * Build the full public surface: { sourceKey: sortedUniqueMembers[] }.
 * Also returns `mirrors` ({ pkg: mirroredPkg }) for reporting.
 */
export function loadSurface(root = REPO_ROOT) {
    const surface = {}
    const mirrors = {}
    for (const [key, rel] of Object.entries(PIN_TESTS)) {
        const text = readFileSync(join(root, rel), 'utf8')
        const { arrays, mirrorsReact } = extractPinnedArrays(text, rel)
        const arrayNames = Object.keys(arrays)
        if (arrayNames.length === 0 && mirrorsReact) {
            mirrors[key] = '@upupjs/react'
            continue
        }
        // @upupjs/next pins two lists (client mirrors react, server is its own):
        // its dedicated key carries the server array. Every other package has a
        // single EXPECTED_PUBLIC_VALUE_EXPORTS.
        const chosen =
            arrays.EXPECTED_SERVER_VALUE_EXPORTS ||
            arrays.EXPECTED_PUBLIC_VALUE_EXPORTS ||
            arrays[arrayNames[0]]
        surface[key] = [...new Set(chosen)].toSorted()
    }
    for (const { key, file, type } of CONTRACT_TYPES) {
        const text = readFileSync(join(root, file), 'utf8')
        surface[key] = [
            ...new Set(extractTypeMembers(text, type, file)),
        ].toSorted()
    }
    return { surface, mirrors }
}

// ── Docs scanning ────────────────────────────────────────────────────────

function listMdx(dirAbs, root) {
    const out = []
    for (const ent of readdirSync(dirAbs, { withFileTypes: true })) {
        const abs = join(dirAbs, ent.name)
        if (ent.isDirectory()) out.push(...listMdx(abs, root))
        else if (ent.name.endsWith('.mdx')) {
            out.push(
                abs
                    .slice(root.length + 1)
                    .split('\\')
                    .join('/'),
            )
        }
    }
    return out
}

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Word-ish match: the member as a token, not a substring. Hyphens inside event
// keys (`upload-error`) are literal; the boundaries only reject adjacent
// identifier characters, so quotes/backticks/spaces around the name all count.
function countMentions(name, text) {
    const re = new RegExp(
        `(?<![A-Za-z0-9_])${escapeRe(name)}(?![A-Za-z0-9_])`,
        'g',
    )
    const m = text.match(re)
    return m ? m.length : 0
}

/**
 * Load every docs page once: { rel, text }. Reused across matcher calls so the
 * check does not re-read the tree per member.
 */
export function loadDocs(root = REPO_ROOT) {
    const abs = join(root, DOCS_ROOT)
    const rels = listMdx(abs, root)
    return rels.map(rel => ({
        rel,
        text: readFileSync(join(root, rel), 'utf8'),
    }))
}

/** Best documenting page for a member, or null if unmentioned anywhere. */
function bestPage(name, docs) {
    const hits = docs
        .map(d => ({ rel: d.rel, count: countMentions(name, d.text) }))
        .filter(h => h.count > 0)
    if (hits.length === 0) return null
    const apiHits = hits.filter(h => h.rel.includes('/api-reference/'))
    const pool = apiHits.length ? apiHits : hits
    const ranked = pool.toSorted(
        (a, b) => b.count - a.count || a.rel.localeCompare(b.rel),
    )
    return ranked[0].rel
}

// ── Exception reasons (honest, grouped) ──────────────────────────────────

const CORE_PLUGIN_RE =
    /^(Box|Dropbox|GoogleDrive|OneDrive|PopupOAuth)Plugin$|_DESCRIPTOR$/
const CORE_CONST_RE =
    /^(ACCEPT_PRESETS|FILE_TYPE_EXTENSIONS|ICONS|NON_S3_STORAGE_PROVIDERS|UPUP_VAR_PREFIX)$/

function reasonFor(sourceKey, member) {
    if (sourceKey === 'contracts:CoreEvents') {
        return 'undocumented: core event-map key — docs document the framework prop/callback surface, not raw core events'
    }
    if (sourceKey === 'contracts:UploaderBaseProps') {
        return 'undocumented: optional prop not yet listed on the optional-props reference page'
    }
    if (sourceKey === '@upupjs/server') {
        return 'undocumented: token-store helper not documented individually (the server-auth guide covers the token-store concept)'
    }
    if (sourceKey === '@upupjs/next/server') {
        return 'undocumented: request-origin helper not documented individually'
    }
    if (/^use[A-Z]/.test(member)) {
        return 'undocumented: headless hook without its own reference page yet (the headless guide documents the pattern, not each hook)'
    }
    if (member.endsWith('Icon')) {
        return 'undocumented: icon component export, not documented individually'
    }
    if (CORE_PLUGIN_RE.test(member)) {
        return 'undocumented: advanced cloud-drive plugin/descriptor export — docs configure drives through the cloudDrives config, not the plugin constructors'
    }
    if (CORE_CONST_RE.test(member)) {
        return 'undocumented: internal constant/registry, not part of the documented config surface'
    }
    return 'undocumented: low-level helper not surfaced in the guides yet'
}

// ── Generation (--write) ─────────────────────────────────────────────────

function regenerate() {
    const { surface, mirrors } = loadSurface()
    const docs = loadDocs()
    const map = {}
    const exceptions = {}
    let mapped = 0
    let excepted = 0
    for (const [key, members] of Object.entries(surface)) {
        for (const member of members) {
            const page = bestPage(member, docs)
            if (page) {
                ;(map[key] ||= {})[member] = page
                mapped++
            } else {
                ;(exceptions[key] ||= {})[member] = reasonFor(key, member)
                excepted++
            }
        }
    }
    const stamp =
        '// GENERATED by scripts/docs/check-api-sync.mjs --write. Edit the docs or the surface, then re-run; do not hand-tune ordering.'
    writeFileSync(
        MAP_PATH,
        JSON.stringify({ _generated: stamp, ...map }, null, 4) + '\n',
    )
    writeFileSync(
        EXCEPTIONS_PATH,
        JSON.stringify({ _generated: stamp, ...exceptions }, null, 4) + '\n',
    )
    const total = mapped + excepted
    console.log(
        `Wrote ${MAP_PATH.replace(REPO_ROOT, '.')} and ${EXCEPTIONS_PATH.replace(REPO_ROOT, '.')}`,
    )
    console.log(
        `surface=${total} mapped=${mapped} excepted=${excepted}; mirrors=${JSON.stringify(mirrors)}`,
    )
}

// ── Check (default) ──────────────────────────────────────────────────────

// A member name distinctive enough that finding it in the docs is meaningful
// (not an incidental English word) — used to liquidate stale exceptions once a
// member becomes documented. Short lowercase props (`mode`, `theme`) are
// excluded to avoid false positives on prose collisions.
function isDistinctive(name) {
    return /[A-Z]/.test(name) || name.includes('-') || name.length >= 12
}

/**
 * Pure gate. Dependency-injected filesystem/docs access so the self-test can
 * drive it with fixtures.
 *   surface:    { source: [members] }
 *   map:        { source: { member: pagePath } }
 *   exceptions: { source: { member: reason } }
 *   pageExists(pagePath) -> boolean
 *   pageContains(pagePath, member) -> boolean
 *   docsMention(member) -> boolean   (mentioned anywhere in docs)
 * Returns an array of { kind, source, member, message }.
 */
export function checkSync({
    surface,
    map,
    exceptions,
    pageExists,
    pageContains,
    docsMention = () => false,
}) {
    const failures = []
    const fail = (kind, source, member, message) =>
        failures.push({ kind, source, member, message })
    const memberInSurface = (source, member) =>
        Array.isArray(surface[source]) && surface[source].includes(member)

    // 1. every surface member is mapped-and-present or excepted
    for (const [source, members] of Object.entries(surface)) {
        for (const member of members) {
            const page = map[source]?.[member]
            const excepted = exceptions[source]?.[member]
            if (page !== undefined) {
                if (excepted !== undefined) {
                    fail(
                        'double-listed',
                        source,
                        member,
                        `mapped to ${page} AND excepted — remove one`,
                    )
                }
                if (!pageExists(page)) {
                    fail(
                        'missing-page',
                        source,
                        member,
                        `mapped page ${page} does not exist`,
                    )
                } else if (!pageContains(page, member)) {
                    fail(
                        'page-missing-member',
                        source,
                        member,
                        `mapped page ${page} no longer mentions "${member}" — update the docs or the map`,
                    )
                }
            } else if (excepted !== undefined) {
                // validity checked in pass 3
            } else {
                fail(
                    'unmapped',
                    source,
                    member,
                    `public API "${member}" (${source}) has no docs — add a page mention + map entry, or add an honest api-sync-exceptions.json entry`,
                )
            }
        }
    }

    // 2. ghost mappings — map entries whose member left the surface
    for (const [source, entries] of Object.entries(map)) {
        for (const member of Object.keys(entries)) {
            if (!memberInSurface(source, member)) {
                fail(
                    'ghost-map',
                    source,
                    member,
                    `map entry "${member}" (${source}) is no longer in the public surface — delete it`,
                )
            }
        }
    }

    // 3. stale exceptions — inverse-forced, self-liquidating
    for (const [source, entries] of Object.entries(exceptions)) {
        for (const member of Object.keys(entries)) {
            if (!memberInSurface(source, member)) {
                fail(
                    'stale-exception',
                    source,
                    member,
                    `exception for "${member}" (${source}) no longer matches a surface member — delete it`,
                )
            } else if (map[source]?.[member] !== undefined) {
                fail(
                    'stale-exception',
                    source,
                    member,
                    `exception for "${member}" (${source}) is now also mapped — delete the exception`,
                )
            } else if (isDistinctive(member) && docsMention(member)) {
                fail(
                    'stale-exception',
                    source,
                    member,
                    `exception for "${member}" (${source}) is now documented — move it to the map`,
                )
            }
        }
    }

    return failures
}

function stripGenerated(obj) {
    const { _generated, ...rest } = obj
    return rest
}

function runCheck() {
    const { surface, mirrors } = loadSurface()
    if (!existsSync(MAP_PATH) || !existsSync(EXCEPTIONS_PATH)) {
        console.error(
            'api-docs-map.json / api-sync-exceptions.json missing — run `node scripts/docs/check-api-sync.mjs --write` first',
        )
        process.exit(1)
    }
    const map = stripGenerated(JSON.parse(readFileSync(MAP_PATH, 'utf8')))
    const exceptions = stripGenerated(
        JSON.parse(readFileSync(EXCEPTIONS_PATH, 'utf8')),
    )
    const docs = loadDocs()
    const docByRel = new Map(docs.map(d => [d.rel, d.text]))

    const failures = checkSync({
        surface,
        map,
        exceptions,
        pageExists: rel =>
            docByRel.has(rel) || existsSync(join(REPO_ROOT, rel)),
        pageContains: (rel, member) => {
            const text = docByRel.get(rel)
            if (text === undefined) return false
            return countMentions(member, text) > 0
        },
        docsMention: member =>
            docs.some(d => countMentions(member, d.text) > 0),
    })

    const total = Object.values(surface).reduce((n, a) => n + a.length, 0)
    let mapped = 0
    for (const s of Object.keys(surface))
        for (const m of surface[s]) if (map[s]?.[m] !== undefined) mapped++
    const excepted = total - mapped

    if (failures.length > 0) {
        console.error(`docs:api-sync found ${failures.length} problem(s):`)
        for (const f of failures) {
            console.error(`  [${f.kind}] ${f.source} :: ${f.member}`)
            console.error(`      ${f.message}`)
        }
        process.exit(1)
    }

    console.log(
        `docs:api-sync OK — ${total} public API members (${mapped} documented, ${excepted} excepted) across ${Object.keys(surface).length} sources; mirrors ${JSON.stringify(mirrors)}`,
    )
}

function main() {
    if (process.argv.includes('--write')) regenerate()
    else runCheck()
}

if (
    process.argv[1] &&
    fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
    main()
}
