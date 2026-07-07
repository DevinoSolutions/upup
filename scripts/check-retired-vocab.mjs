#!/usr/bin/env node

/**
 * Retired-vocabulary census guard.
 *
 * Usage:
 *   node scripts/check-retired-vocab.mjs   (root: `pnpm run vocab:check`)
 *
 * The naming sweeps (§16, N1-N4) retire vocabulary in EVERY layer — TS
 * identifiers, DOM contract strings (data-upup-slot values, Angular element
 * selectors), i18n keys, fixtures. The eslint retired-identifier ban only sees
 * the identifier layer; the 2026-07-07 grading audit found `main-box` DOM
 * strings that survived N4 in four frameworks precisely because nothing
 * scanned string literals. This guard closes that gap: it greps every tracked
 * source file for retired tokens so a sweep can never half-land again.
 *
 * Adding a retired name: append to RETIRED (regex + replacement hint).
 * Legitimate mentions (a ban list, a migration guide) go in KNOWN_EXCEPTIONS —
 * which is self-liquidating: an exception that no longer matches anything
 * FAILS the run so stale entries cannot accumulate (inverse-forcing check).
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'

// ── Retired tokens ───────────────────────────────────────────────────────

const RETIRED = [
    // Uploader-panel DOM vocabulary (kebab covers upup-main-box* selectors too)
    { name: 'main-box', pattern: /main-box/, useInstead: 'uploader-panel' },
    { name: 'MainBox', pattern: /MainBox/, useInstead: 'UploaderPanel' },
    { name: 'mainBox', pattern: /mainBox/, useInstead: 'uploaderPanel' },
    // §16 / N-series identifier retirements (mirrors the eslint identifier ban,
    // but at the string layer so comments, templates, and fixtures count too)
    {
        name: 'useRootProvider',
        pattern: /useRootProvider/,
        useInstead: 'useUploaderController',
    },
    {
        name: 'RootContext',
        pattern: /RootContext/,
        useInstead: 'UploaderContext',
    },
    {
        name: 'ShouldRender',
        pattern: /ShouldRender/,
        useInstead: '(removed in R9)',
    },
    {
        name: 'composeEnhancers',
        pattern: /composeEnhancers/,
        useInstead: '(dead API, removed)',
    },
    {
        name: 'gzipStep',
        pattern: /gzipStep/,
        useInstead: '(dead API, removed)',
    },
    {
        name: 'deduplicateStep',
        pattern: /deduplicateStep/,
        useInstead: '(dead API, removed)',
    },
    {
        name: 'ServerOAuth',
        pattern: /ServerOAuth/,
        useInstead: 'ServerModeDriveController',
    },
    {
        name: 'OAuthStrategy',
        pattern: /OAuthStrategy/,
        useInstead: 'ServerModeDriveController',
    },
    // Past-tense callback ruling (N3): the alias without the trailing d is dead
    {
        name: 'onFileRemove',
        pattern: /onFileRemove(?!d)/,
        useInstead: 'onFileRemoved',
    },
]

// ── Scan set ─────────────────────────────────────────────────────────────

const SCAN_ROOTS = ['packages', 'apps', 'scripts', '.github']

const EXTENSIONS = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
    '.vue',
    '.svelte',
    '.html',
    '.css',
    '.json',
    '.md',
    '.yml',
    '.yaml',
])

// Paths that may legitimately NAME retired vocabulary (never USE it).
const EXCLUDED_PATHS = [
    'scripts/check-retired-vocab.mjs', // this file is the token list
    'apps/docs/docs/migration/', // migration guides teach old -> new
]

const EXCLUDED_SUFFIXES = ['CHANGELOG.md'] // release history is immutable

// (file, token) pairs allowed to keep matching. Inverse-forced: an entry that
// stops matching fails the run so the list can only shrink with the code.
const KNOWN_EXCEPTIONS = [
    {
        file: 'packages/eslint-config/index.mjs',
        tokens: [
            'main-box',
            'MainBox',
            'useRootProvider',
            'ShouldRender',
            'composeEnhancers',
            'gzipStep',
            'deduplicateStep',
            'ServerOAuth',
            'OAuthStrategy',
            'onFileRemove',
        ],
        reason: 'the retired-name eslint bans (identifier, property, and string-literal layers) name their own targets',
    },
]

// ── Census ───────────────────────────────────────────────────────────────

const files = execFileSync('git', ['ls-files', ...SCAN_ROOTS], {
    encoding: 'utf8',
})
    .split('\n')
    .filter(Boolean)
    .filter(f => EXTENSIONS.has(extname(f)))
    .filter(f => !EXCLUDED_PATHS.some(p => f === p || f.startsWith(p)))
    .filter(f => !EXCLUDED_SUFFIXES.some(s => f.endsWith(s)))

const exceptionIndex = new Map(
    KNOWN_EXCEPTIONS.map(e => [e.file, new Set(e.tokens)]),
)
const exceptionSeen = new Map(KNOWN_EXCEPTIONS.map(e => [e.file, new Set()]))

const violations = []
for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const token of RETIRED) {
        if (!token.pattern.test(text)) continue
        if (exceptionIndex.get(file)?.has(token.name)) {
            exceptionSeen.get(file).add(token.name)
            continue
        }
        const lines = text.split('\n')
        for (let i = 0; i < lines.length; i++) {
            if (token.pattern.test(lines[i])) {
                violations.push(
                    `${file}:${i + 1}: retired "${token.name}" — use ${token.useInstead}`,
                )
            }
        }
    }
}

const staleExceptions = []
for (const e of KNOWN_EXCEPTIONS) {
    for (const token of e.tokens) {
        if (!exceptionSeen.get(e.file).has(token)) {
            staleExceptions.push(
                `${e.file}: exception for "${token}" no longer matches — delete the stale entry`,
            )
        }
    }
}

if (violations.length > 0 || staleExceptions.length > 0) {
    if (violations.length > 0) {
        console.error(
            `Retired vocabulary found (${violations.length} line(s)) — finish the sweep:`,
        )
        for (const v of violations) console.error(`  ${v}`)
    }
    if (staleExceptions.length > 0) {
        console.error('Stale exceptions (inverse-forcing check):')
        for (const s of staleExceptions) console.error(`  ${s}`)
    }
    process.exit(1)
}

console.log(
    `vocab:check OK — ${files.length} tracked files clean of ${RETIRED.length} retired tokens (${KNOWN_EXCEPTIONS.length} pinned exception file(s))`,
)
