#!/usr/bin/env node

/**
 * Test-quality guard.
 *
 * Usage:
 *   node scripts/ci/test-quality-guard.mjs   (root: `pnpm run test:quality`)
 *
 * Fails the gate on test-suite rot that review reliably misses: committed
 * `.only`, silently disabled tests, tautological assertions, vague test
 * names/filenames, unjustified Playwright sleeps, framework mocks leaking
 * into integration/e2e layers, deletion of the fixture-regen CI guards, and
 * `continue-on-error` in workflows. The 2026-07-09 census found the suite
 * already clean (0 `.only`, 0 disabled, 0 tautologies, 0 vague names) — this
 * guard exists so it stays that way.
 *
 * Justification markers (same line or up to 3 lines above the finding):
 *   sleep-allow(<why this wait cannot be event-driven>)
 *   boundary-mock(<external service this fakes>)
 *   skip-allow(owner=<who> reason=<why> until=YYYY-MM-DD)   — until is
 *     enforced: an expired skip fails the run (self-liquidating).
 *
 * KNOWN_EXCEPTIONS is inverse-forced like check-retired-vocab.mjs: an entry
 * that no longer matches anything fails the run, so the list only shrinks.
 * It ships EMPTY — prefer fixing findings over listing them.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// ── File classification ──────────────────────────────────────────────────

const TEST_FILE_RE = /\.(?:test|spec)\.(?:ts|tsx|js|jsx|mjs|cjs|mts|cts)$/

// Playwright suites are identified by DIRECTORY, not extension: packages'
// unit tests (angular) also use `.spec.ts`.
const PLAYWRIGHT_DIRS = [
    'apps/e2e-test/e2e/',
    'apps/e2e-test/cross-framework/',
    'apps/playground/e2e/',
]

const isPlaywrightSpec = file => PLAYWRIGHT_DIRS.some(d => file.startsWith(d))
const isIntegrationTest = file => /\.integration\.test\./.test(file)

// ── Vague-name blocklists ────────────────────────────────────────────────

// Exact (lowercased, trimmed) test titles that describe nothing.
const VAGUE_TITLES = new Set([
    'works',
    'it works',
    'renders',
    'smoke',
    'smoke test',
    'test',
    'testing',
    'upload test',
    'server test',
    'storybook',
    'handles error',
    'handles errors',
    'should work',
    'should submit',
    'api returns 200',
    'returns 200',
    'no errors',
    'does not crash',
    'happy path',
    'basic test',
    'edge case',
    'edge cases',
])

// Test file basenames (after stripping .integration/.test/.spec suffixes)
// that say nothing about the behavior under test.
const VAGUE_BASENAMES = new Set([
    'utils',
    'util',
    'misc',
    'index',
    'app',
    'page',
    'new',
    'common',
    'temp',
    'tmp',
    'main',
    'helper',
    'helpers',
    'stuff',
    'foo',
    'test',
    'tests',
    'spec',
    'data',
])

// ── Markers ──────────────────────────────────────────────────────────────

const MARKER_LOOKBACK_LINES = 3

const hasMarkerNear = (lines, index, marker) => {
    for (let i = index; i >= Math.max(0, index - MARKER_LOOKBACK_LINES); i--) {
        if (lines[i].includes(`${marker}(`)) return true
    }
    return false
}

const SKIP_ALLOW_RE =
    /skip-allow\(\s*owner=(\S+)\s+reason=(.+?)\s+until=(\d{4}-\d{2}-\d{2})\s*\)/

const findSkipAllow = (lines, index) => {
    for (let i = index; i >= Math.max(0, index - MARKER_LOOKBACK_LINES); i--) {
        const m = lines[i].match(SKIP_ALLOW_RE)
        if (m) return { owner: m[1], reason: m[2], until: m[3] }
    }
    return null
}

// ── Rules ────────────────────────────────────────────────────────────────

// Compute 0-based line number of a match index without re-splitting per hit.
const makeLineLocator = text => {
    const starts = [0]
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n') starts.push(i + 1)
    }
    return index => {
        let lo = 0
        let hi = starts.length - 1
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1
            if (starts[mid] <= index) lo = mid
            else hi = mid - 1
        }
        return lo
    }
}

/** First non-whitespace character following the call's opening paren decides
 *  whether a `.skip(`/`.fixme(` is a CONDITIONAL runtime skip (allowed —
 *  Playwright's `test.skip(expr, 'reason')` documents itself) or a disabled
 *  test (first arg is the title string, or no args at all). */
const isConditionalSkipCall = (text, parenIndex) => {
    for (let i = parenIndex + 1; i < text.length; i++) {
        const c = text[i]
        if (c === ' ' || c === '\t' || c === '\n' || c === '\r') continue
        return c !== '"' && c !== "'" && c !== '`' && c !== ')'
    }
    return false
}

export function analyzeTestFile(file, text, { today = new Date() } = {}) {
    const violations = []
    const lines = text.split('\n')
    const locate = makeLineLocator(text)
    const report = (index, rule, message) =>
        violations.push({ file, line: locate(index) + 1, rule, message })

    // G1 — committed .only
    for (const m of text.matchAll(
        /\b(?:describe|it|test)(?:\.describe)?\.only\s*\(/g,
    )) {
        report(m.index, 'only', 'committed .only — remove before merging')
    }

    // G2 — disabled tests need skip-allow(owner… reason… until…)
    const disabledPatterns = [
        /\b(?:it|test|describe)(?:\.describe)?\.(?:skip|fixme)\s*\(/g,
        /\b(?:it|test)\.todo\s*\(/g,
        /\b(?:xit|xdescribe|xtest|fit|fdescribe)\s*\(/g,
    ]
    for (const pattern of disabledPatterns) {
        for (const m of text.matchAll(pattern)) {
            const parenIndex = m.index + m[0].length - 1
            if (
                /\.(?:skip|fixme)\s*\($/.test(m[0]) &&
                isConditionalSkipCall(text, parenIndex)
            ) {
                continue // runtime-conditional skip with its own reason arg
            }
            const line = locate(m.index)
            const allow = findSkipAllow(lines, line)
            if (!allow) {
                report(
                    m.index,
                    'silent-skip',
                    'disabled test without skip-allow(owner=… reason=… until=YYYY-MM-DD)',
                )
                continue
            }
            if (new Date(`${allow.until}T23:59:59Z`) < today) {
                report(
                    m.index,
                    'expired-skip',
                    `skip-allow expired ${allow.until} (owner=${allow.owner}) — fix or re-justify`,
                )
            }
        }
    }

    // G3 — tautological assertions
    const tautologies = [
        /expect\(\s*(true|false|1|0)\s*\)\s*\.\s*(?:toBe|toEqual|toStrictEqual)\(\s*\1\s*\)/g,
        /expect\(\s*(?:true|1)\s*\)\s*\.\s*toBeTruthy\(\s*\)/g,
        /expect\(\s*(?:false|0|null|undefined)\s*\)\s*\.\s*toBeFalsy\(\s*\)/g,
    ]
    for (const pattern of tautologies) {
        for (const m of text.matchAll(pattern)) {
            report(
                m.index,
                'tautology',
                `assertion is trivially true: ${m[0].replace(/\s+/g, ' ')}`,
            )
        }
    }

    // G4 — vague or single-word test titles (it/test only; describe is grouping)
    for (const m of text.matchAll(
        /\b(?:it|test)\s*\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g,
    )) {
        const title = m[2].trim()
        const lowered = title.toLowerCase()
        if (VAGUE_TITLES.has(lowered)) {
            report(
                m.index,
                'vague-name',
                `test title "${title}" says nothing — name the behavior and condition`,
            )
            continue
        }
        const isTemplated = /%[sdifjo#%]|\$\{/.test(title)
        if (!isTemplated && title.length > 0 && !/\s/.test(title)) {
            report(
                m.index,
                'vague-name',
                `single-word test title "${title}" — name the behavior and condition`,
            )
        }
    }

    // G6 — sleeps in Playwright specs need sleep-allow(reason)
    if (isPlaywrightSpec(file)) {
        const sleepPatterns = [
            /\bwaitForTimeout\s*\(/g,
            // the awaited promise-sleep idiom; bare setTimeout callbacks
            // (route-mock latency shaping) are not sleeps and stay allowed
            /await\s+new\s+Promise\s*\(\s*(?:\w+|\(\s*\w+\s*\))\s*=>\s*setTimeout\s*\(/g,
        ]
        for (const pattern of sleepPatterns) {
            for (const m of text.matchAll(pattern)) {
                const line = locate(m.index)
                if (!hasMarkerNear(lines, line, 'sleep-allow')) {
                    report(
                        m.index,
                        'sleep',
                        'arbitrary wait without sleep-allow(<reason>) — prefer event/locator waits',
                    )
                }
            }
        }
    }

    // G7 — framework mocks in integration/e2e layers need boundary-mock(service)
    if (isPlaywrightSpec(file) || isIntegrationTest(file)) {
        for (const m of text.matchAll(/\b(?:vi|jest)\.mock\s*\(/g)) {
            const line = locate(m.index)
            if (!hasMarkerNear(lines, line, 'boundary-mock')) {
                report(
                    m.index,
                    'integration-mock',
                    'module mock in an integration/e2e layer without boundary-mock(<external service>)',
                )
            }
        }
    }

    return violations
}

export function analyzeTestFileName(file) {
    const base = file.split('/').pop()
    const core = base.replace(
        /(?:\.integration)?\.(?:test|spec)\.(?:ts|tsx|js|jsx|mjs|cjs|mts|cts)$/,
        '',
    )
    if (VAGUE_BASENAMES.has(core.toLowerCase())) {
        return [
            {
                file,
                line: 0,
                rule: 'vague-filename',
                message: `"${base}" names no behavior — describe what the file protects`,
            },
        ]
    }
    return []
}

export function analyzeWorkflow(file, text) {
    const violations = []
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
        if (/^\s*continue-on-error\s*:/.test(lines[i])) {
            violations.push({
                file,
                line: i + 1,
                rule: 'continue-on-error',
                message:
                    'continue-on-error hides failures from required checks — remove it',
            })
        }
    }
    return violations
}

/** The parity/a11y specs each carry an in-spec throw that blocks fixture
 *  regeneration under CI (belt to e2e.yml's braces). Deleting either guard
 *  must turn this gate red. */
const REGEN_GUARDED_SPECS = [
    {
        file: 'apps/e2e-test/cross-framework/parity.spec.ts',
        env: 'UPDATE_PARITY',
    },
    {
        file: 'apps/e2e-test/cross-framework/a11y-overflow.spec.ts',
        env: 'UPDATE_A11Y_BASELINE',
    },
]

export function analyzeRegenGuards(readFile) {
    const violations = []
    for (const spec of REGEN_GUARDED_SPECS) {
        let text
        try {
            text = readFile(spec.file)
        } catch {
            violations.push({
                file: spec.file,
                line: 0,
                rule: 'regen-guard',
                message: 'guarded spec is missing — update REGEN_GUARDED_SPECS',
            })
            continue
        }
        const hasGuard =
            text.includes('process.env.CI') &&
            text.includes(spec.env) &&
            /throw new Error/.test(text)
        if (!hasGuard) {
            violations.push({
                file: spec.file,
                line: 0,
                rule: 'regen-guard',
                message: `in-spec CI guard for ${spec.env} regeneration is gone — restore the throw`,
            })
        }
    }
    return violations
}

// ── Exceptions (inverse-forced; ships empty) ─────────────────────────────

export const KNOWN_EXCEPTIONS = []

// The guard's own self-test is an adversarial fixture corpus: its string
// literals are deliberately-bad test specimens (.only, tautologies, silent
// skips, vague names) that the node:test cases feed to analyzeTestFile().
// Scanning it flags its own test DATA — the one file the scanner cannot
// meaningfully analyze. Excluded by exact path rather than through
// KNOWN_EXCEPTIONS, which must keep shipping empty; the self-test pins this
// set's exact contents so it cannot quietly grow into a bypass list.
// (Trap that motivated this: discovery reads `git ls-files`, so the
// pre-commit verification run could not see the then-untracked self-test —
// the commit that landed the guard is what made its corpus scannable.)
export const SELF_TEST_FIXTURE_FILES = new Set([
    'scripts/ci/test-quality-guard.test.mjs',
])

// ── Census ───────────────────────────────────────────────────────────────

const read = file => readFileSync(file, 'utf8')

function main() {
    const tracked = execFileSync(
        'git',
        ['ls-files', 'packages', 'apps', 'scripts', '.github'],
        { encoding: 'utf8' },
    )
        .split('\n')
        .filter(Boolean)

    const testFiles = tracked.filter(
        f => TEST_FILE_RE.test(f) && !SELF_TEST_FIXTURE_FILES.has(f),
    )
    const workflowFiles = tracked.filter(f =>
        /^\.github\/workflows\/[^/]+\.ya?ml$/.test(f),
    )

    let violations = []

    for (const file of testFiles) {
        let text
        try {
            text = read(file)
        } catch (err) {
            if (err.code === 'ENOENT') continue // unstaged rename, see vocab guard
            throw err
        }
        violations.push(...analyzeTestFile(file, text))
        violations.push(...analyzeTestFileName(file))
    }
    for (const file of workflowFiles) {
        violations.push(...analyzeWorkflow(file, read(file)))
    }
    violations.push(...analyzeRegenGuards(read))

    const exceptionSeen = new Set()
    violations = violations.filter(v => {
        const match = KNOWN_EXCEPTIONS.find(
            e => e.file === v.file && e.rule === v.rule,
        )
        if (match) {
            exceptionSeen.add(match)
            return false
        }
        return true
    })
    const staleExceptions = KNOWN_EXCEPTIONS.filter(
        e => !exceptionSeen.has(e),
    ).map(
        e =>
            `${e.file}: exception for "${e.rule}" no longer matches — delete the stale entry`,
    )

    if (violations.length > 0 || staleExceptions.length > 0) {
        if (violations.length > 0) {
            console.error(`test:quality found ${violations.length} finding(s):`)
            for (const v of violations) {
                console.error(`  ${v.file}:${v.line}: [${v.rule}] ${v.message}`)
            }
        }
        if (staleExceptions.length > 0) {
            console.error('Stale exceptions (inverse-forcing check):')
            for (const s of staleExceptions) console.error(`  ${s}`)
        }
        process.exit(1)
    }

    console.log(
        `test:quality OK — ${testFiles.length} test files + ${workflowFiles.length} workflows clean (0 exceptions pinned)`,
    )
}

if (
    process.argv[1] &&
    fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
    main()
}
