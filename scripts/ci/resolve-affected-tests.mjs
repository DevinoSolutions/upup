#!/usr/bin/env node

/**
 * Impact map for CI test routing.
 *
 * Decides, from a PR's changed files, which suites must run:
 *   e2e     — Playwright deep + cross-framework suites (apps/e2e-test)
 *   minio   — the real-MinIO server integration steps of the E2E job
 *   smoke   — the npm-tarball consumer (Smoke-Packages)
 *   docsE2e — the landing `docs` Playwright project (Docs-E2E); cheap,
 *             secret-less, boots the landing app and drives /docs. On for a
 *             change to the landing app (incl. content/docs), the landing e2e
 *             harness, or any package the landing app consumes.
 *
 * Fail-open is the core safety property: a path that matches no rule runs
 * EVERYTHING. An unknown/new directory can never silently skip coverage.
 *
 * main.yml (static + unit gates) is deliberately NOT routed — those always run.
 * This resolver feeds e2e.yml's Resolve-Affected job only.
 *
 * Usage:
 *   node scripts/ci/resolve-affected-tests.mjs --base <ref> --head <ref>
 *       Diff via `git diff --name-only <base>...<head>` (three-dot merge-base).
 *   node scripts/ci/resolve-affected-tests.mjs --files "a,b" [--files c]
 *       Bypass git; value is comma/newline-joined and the flag may repeat.
 *   node scripts/ci/resolve-affected-tests.mjs --all
 *       Force every suite (workflow_dispatch / manual re-run).
 *   --json   Emit {suites, reasons, changedFiles} to stdout; no side effects.
 *
 * Default (non-json) output appends `e2e|minio|smoke|docsE2e=true|false` to the
 * file at $GITHUB_OUTPUT (when set), appends a markdown table to $GITHUB_STEP_SUMMARY
 * (when set), and always prints a human-readable per-suite reason table.
 *
 * Exit 0 in every resolved case (empty diff included → all suites false).
 * Exit non-zero ONLY on operational errors: a failing `git diff`, or bad args.
 */

import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

// ── Suites ───────────────────────────────────────────────────────────────

/** The routable suites, in stable display order. `docsE2e` is the cheap docs
 * job; the other three are the heavy MinIO/cross-framework/tarball suites. */
export const SUITES = ['e2e', 'minio', 'smoke', 'docsE2e']

// ── Tiers & precedence ───────────────────────────────────────────────────
//
// A single changed file is classified into exactly one tier; the tier decides
// its suites. Precedence (highest first) is:
//
//   UNIVERSAL  > LIGHT_DOC > TARGETED > LIGHT_DIR > (fail-open)
//
// so that, per file:
//   - a config basename / shared factory beats everything          (UNIVERSAL)
//   - a README/doc beats the directory it lives in                 (LIGHT_DOC)
//   - a package/app source change routes to its suites             (TARGETED)
//   - a dev-only app/meta file routes nowhere                      (LIGHT_DIR)
//   - anything unmatched fails open to every suite                 (fail-open)

const TIER = {
    UNIVERSAL: 'universal',
    LIGHT_DOC: 'light-doc',
    TARGETED: 'targeted',
    LIGHT_DIR: 'light-dir',
}

const TIER_RANK = {
    [TIER.UNIVERSAL]: 0,
    [TIER.LIGHT_DOC]: 1,
    [TIER.TARGETED]: 2,
    [TIER.LIGHT_DIR]: 3,
}

// ── Predicates ───────────────────────────────────────────────────────────

const ROOT_MANIFESTS = new Set([
    'package.json', // ROOT only — a package's package.json is targeted, below
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'turbo.json',
    '.nvmrc',
    '.npmrc',
    '.size-limit.json',
])

/**
 * A config file whose basename invalidates build/test/lint routing wherever it
 * lives (e.g. `packages/react/vitest.config.ts` or a nested `tsconfig.json`).
 */
function isUniversalConfigBasename(name) {
    return (
        /^tsconfig.*\.json$/.test(name) ||
        name.startsWith('vitest.config.') ||
        name.startsWith('vite.config.') ||
        /^playwright.*\.config\..+$/.test(name) ||
        name.startsWith('.prettierrc') ||
        name === 'knip.jsonc' ||
        name.startsWith('.oxlintrc') ||
        name.startsWith('eslint.config.')
    )
}

const FRAMEWORK_UI =
    /^packages\/(react|vue|svelte|angular|vanilla|preact|next)\//

// ── Impact rules (exported data — the CLI is a thin wrapper) ──────────────
//
// Every changed file is tested against EVERY rule; per file the highest-
// precedence matching tier wins, and within the TARGETED tier the suites of
// all matching rules are unioned. Order here is documentation, not logic —
// precedence comes from `tier`, so rules may be listed in the clearest order.

export const IMPACT_RULES = [
    // ── UNIVERSAL → ALL ──────────────────────────────────────────────────
    {
        name: 'root-manifest',
        tier: TIER.UNIVERSAL,
        suites: 'ALL',
        test: path => ROOT_MANIFESTS.has(path),
    },
    {
        name: 'ci-or-workflow',
        tier: TIER.UNIVERSAL,
        suites: 'ALL',
        test: path =>
            path.startsWith('.github/workflows/') ||
            path.startsWith('scripts/ci/'),
    },
    {
        name: 'shared-config-factory',
        tier: TIER.UNIVERSAL,
        suites: 'ALL',
        test: path =>
            path.startsWith('packages/eslint-config/') ||
            path.startsWith('packages/tailwind-config/'),
    },
    {
        name: 'config-basename',
        tier: TIER.UNIVERSAL,
        suites: 'ALL',
        test: path => isUniversalConfigBasename(basename(path)),
    },

    // ── LIGHT_DOC → NONE (beats the directory a doc lives in) ────────────
    {
        name: 'markdown',
        tier: TIER.LIGHT_DOC,
        suites: 'NONE',
        test: path => /\.md$/i.test(path),
    },
    {
        name: 'docs-tree',
        tier: TIER.LIGHT_DOC,
        suites: 'NONE',
        test: path => path.startsWith('docs/'),
    },

    // ── TARGETED → union of suites ───────────────────────────────────────
    {
        name: 'core-or-server',
        tier: TIER.TARGETED,
        suites: ['e2e', 'minio', 'smoke'],
        test: path =>
            path.startsWith('packages/core/') ||
            path.startsWith('packages/server/'),
    },
    {
        name: 'framework-ui',
        tier: TIER.TARGETED,
        suites: ['e2e', 'smoke'],
        test: path => FRAMEWORK_UI.test(path),
    },
    {
        name: 'storybook',
        tier: TIER.TARGETED,
        suites: ['e2e'],
        test: path =>
            path.startsWith('packages/storybook-config/') ||
            path.startsWith('apps/storybook-'),
    },
    {
        name: 'e2e-harness',
        tier: TIER.TARGETED,
        suites: ['e2e', 'minio'],
        test: path => path.startsWith('apps/e2e-test/'),
    },
    {
        name: 'minio-infra',
        tier: TIER.TARGETED,
        suites: ['e2e', 'minio'],
        test: path =>
            path === 'docker-compose.yml' ||
            path.startsWith('local-dev/') ||
            path === 'scripts/upup-e2e-server.mjs' ||
            path === 'scripts/validate-env.mjs',
    },
    {
        name: 'smoke-consumer',
        tier: TIER.TARGETED,
        suites: ['smoke'],
        test: path =>
            path === 'scripts/package-smoke-consumer.mjs' ||
            path.startsWith('scripts/lib/'),
    },
    {
        // The docs live in apps/landing (MDX under content/docs, served at
        // /docs by fumadocs) and are proven by the `docs` Playwright project in
        // apps/e2e-test/landing. The landing app also renders a live creds-free
        // uploader demo built from @upupjs/{core,react,server} + the private
        // interactive-example, so a change to ANY landing-consumed package can
        // regress the docs surface — those are exactly apps/landing/package.json's
        // workspace deps. TARGETED (not LIGHT) so it outranks the LIGHT_DIR
        // dev-app / interactive-example rules by tier and its lone `docsE2e`
        // suite unions with whatever heavy suites those same files already
        // carry (core → e2e+minio+smoke, react → e2e+smoke), leaving the
        // existing heavy-suite verdicts byte-identical. UNIVERSAL and fail-open
        // include docsE2e for free (they route to every SUITES entry).
        name: 'docs-e2e',
        tier: TIER.TARGETED,
        suites: ['docsE2e'],
        test: path =>
            path.startsWith('apps/landing/') ||
            path.startsWith('apps/e2e-test/landing/') ||
            path === 'apps/e2e-test/playwright.landing.config.ts' ||
            path.startsWith('packages/core/') ||
            path.startsWith('packages/react/') ||
            path.startsWith('packages/server/') ||
            path.startsWith('packages/interactive-example/'),
    },

    // ── LIGHT_DIR → NONE (dev-only apps + repo metadata) ─────────────────
    {
        // apps/landing/ also covers the docs (MDX under content/docs, served
        // at /docs by fumadocs) — a docs-content edit stays light like any
        // other marketing-site change.
        name: 'dev-app',
        tier: TIER.LIGHT_DIR,
        suites: 'NONE',
        test: path =>
            path.startsWith('apps/landing/') ||
            path.startsWith('apps/playground/') ||
            path.startsWith('apps/next-example/') ||
            path.startsWith('apps/mastra/'),
    },
    {
        name: 'interactive-example',
        tier: TIER.LIGHT_DIR,
        suites: 'NONE',
        test: path => path.startsWith('packages/interactive-example/'),
    },
    {
        name: 'github-meta',
        tier: TIER.LIGHT_DIR,
        suites: 'NONE',
        // non-workflow .github leftovers (dependabot.yml, release.yml,
        // ISSUE_TEMPLATE/**). Workflows are UNIVERSAL and win by rank.
        test: path =>
            path.startsWith('.github/') &&
            !path.startsWith('.github/workflows/'),
    },
    {
        name: 'repo-meta',
        tier: TIER.LIGHT_DIR,
        suites: 'NONE',
        test: path =>
            path.startsWith('assets/') ||
            path.startsWith('.husky/') ||
            path.startsWith('.vscode/') ||
            path === '.gitignore' ||
            path === '.gitattributes' ||
            basename(path).startsWith('LICENSE'),
    },
]

// ── Resolution ───────────────────────────────────────────────────────────

/**
 * Classify one repo-relative path into the suites it requires.
 * @returns {{ suites: string[], tier: string, rule: string }}
 */
export function resolveFile(path) {
    const matches = IMPACT_RULES.filter(rule => rule.test(path))
    if (matches.length === 0) {
        return { suites: [...SUITES], tier: 'fail-open', rule: 'fail-open' }
    }

    let bestRank = Infinity
    for (const m of matches) bestRank = Math.min(bestRank, TIER_RANK[m.tier])
    const winners = matches.filter(m => TIER_RANK[m.tier] === bestRank)
    const tier = winners[0].tier

    if (tier === TIER.UNIVERSAL) {
        return { suites: [...SUITES], tier, rule: winners[0].name }
    }
    if (tier === TIER.LIGHT_DOC || tier === TIER.LIGHT_DIR) {
        return { suites: [], tier, rule: winners[0].name }
    }

    // TARGETED: union the suites of every matching targeted rule.
    const selected = new Set()
    for (const w of winners) for (const s of w.suites) selected.add(s)
    return {
        suites: SUITES.filter(s => selected.has(s)),
        tier,
        rule: winners.map(w => w.name).join('+'),
    }
}

/**
 * Resolve a whole changeset: union the per-file suites and record why each
 * suite ran (or was skipped).
 * @param {string[]} changedFiles
 * @param {{ forceAll?: boolean }} [options]
 */
export function resolveAffected(changedFiles, options = {}) {
    const suites = Object.fromEntries(SUITES.map(s => [s, false]))

    if (options.forceAll) {
        for (const s of SUITES) suites[s] = true
        const reason = 'forced (--all / workflow_dispatch)'
        return {
            suites,
            reasons: Object.fromEntries(SUITES.map(s => [s, reason])),
            changedFiles: [...changedFiles],
            unmatched: [],
            forcedAll: true,
        }
    }

    const triggers = Object.fromEntries(SUITES.map(s => [s, []]))
    const unmatched = []
    for (const file of changedFiles) {
        const resolved = resolveFile(file)
        if (resolved.tier === 'fail-open') unmatched.push(file)
        for (const s of resolved.suites) {
            suites[s] = true
            triggers[s].push({ file, rule: resolved.rule })
        }
    }

    const reasons = {}
    for (const s of SUITES) {
        if (changedFiles.length === 0) {
            reasons[s] = 'no changed files'
        } else if (suites[s]) {
            reasons[s] = describeTriggers(triggers[s])
        } else {
            reasons[s] = 'skipped — no changed file affects this suite'
        }
    }

    return { suites, reasons, changedFiles: [...changedFiles], unmatched }
}

function describeTriggers(list) {
    const shown = list.slice(0, 3).map(t => `${t.file} (${t.rule})`)
    const extra = list.length - shown.length
    return extra > 0 ? `${shown.join(', ')} +${extra} more` : shown.join(', ')
}

// ── Git ──────────────────────────────────────────────────────────────────

/**
 * Changed files via three-dot diff (changes on <head> since the merge-base
 * with <base>). Git emits forward-slash paths already. Throws on git failure.
 */
export function changedFilesFromGit(base, head) {
    const out = execFileSync(
        'git',
        ['diff', '--name-only', `${base}...${head}`],
        { encoding: 'utf8' },
    )
    return out
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
}

// ── Output formatting ──────────────────────────────────────────────────────

function formatReasonTable(result) {
    const lines = ['Affected test suites (feeds e2e.yml Resolve-Affected):']
    for (const suite of SUITES) {
        const decision = result.suites[suite] ? 'RUN ' : 'SKIP'
        lines.push(`  ${suite.padEnd(6)} ${decision}  ${result.reasons[suite]}`)
    }
    if (result.forcedAll) {
        lines.push('')
        lines.push('All suites forced via --all / workflow_dispatch.')
        return lines.join('\n') + '\n'
    }
    lines.push('')
    lines.push(`Changed files (${result.changedFiles.length}):`)
    if (result.changedFiles.length === 0) {
        lines.push('  (none)')
    } else {
        for (const file of result.changedFiles) lines.push(`  ${file}`)
    }
    if (result.unmatched.length > 0) {
        lines.push('')
        lines.push(
            `Fail-open: ${result.unmatched.length} file(s) matched no rule and force every suite:`,
        )
        for (const file of result.unmatched) lines.push(`  ${file}`)
    }
    return lines.join('\n') + '\n'
}

function formatMarkdownSummary(result) {
    // Escape the backslash FIRST, then the pipe — otherwise a literal backslash
    // in a reason (e.g. a Windows-style path) leaves the following pipe behind an
    // even-length backslash run, where it stays a live table delimiter and can
    // inject a column into the GitHub step summary.
    const escape = value =>
        String(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|')
    const rows = SUITES.map(
        suite =>
            `| ${suite} | ${result.suites[suite] ? 'run' : 'skip'} | ${escape(
                result.reasons[suite],
            )} |`,
    )
    return (
        '### Affected test suites\n\n' +
        '| Suite | Decision | Reason |\n| --- | --- | --- |\n' +
        rows.join('\n') +
        '\n'
    )
}

function writeGithubOutput(suites) {
    const file = process.env.GITHUB_OUTPUT
    if (!file) return
    const body = SUITES.map(s => `${s}=${suites[s]}`).join('\n') + '\n'
    appendFileSync(file, body)
}

function writeStepSummary(result) {
    const file = process.env.GITHUB_STEP_SUMMARY
    if (!file) return
    appendFileSync(file, formatMarkdownSummary(result))
}

// ── CLI ────────────────────────────────────────────────────────────────────

const USAGE = `Usage:
  resolve-affected-tests.mjs --base <ref> --head <ref>
  resolve-affected-tests.mjs --files "<path,path>" [--files <path>]
  resolve-affected-tests.mjs --all
Options:
  --json   emit {suites, reasons, changedFiles} to stdout; no side effects
  -h, --help
`

function splitFilesInput(values) {
    const files = []
    for (const value of values) {
        for (const part of value.split(/[\n,]/)) {
            const file = part.trim()
            if (file) files.push(file)
        }
    }
    return files
}

function fail(message) {
    process.stderr.write(`error: ${message}\n\n${USAGE}`)
    return 2
}

/**
 * @returns {number} process exit code
 */
export function main(argv) {
    let values
    try {
        ;({ values } = parseArgs({
            args: argv,
            options: {
                base: { type: 'string' },
                head: { type: 'string' },
                files: { type: 'string', multiple: true },
                all: { type: 'boolean' },
                json: { type: 'boolean' },
                help: { type: 'boolean', short: 'h' },
            },
            allowPositionals: false,
        }))
    } catch (err) {
        return fail(err.message)
    }

    if (values.help) {
        process.stdout.write(USAGE)
        return 0
    }

    let result
    if (values.all) {
        result = resolveAffected([], { forceAll: true })
    } else if (values.files && values.files.length > 0) {
        result = resolveAffected(splitFilesInput(values.files))
    } else if (values.base || values.head) {
        if (!values.base || !values.head) {
            return fail('--base and --head must be provided together')
        }
        let changedFiles
        try {
            changedFiles = changedFilesFromGit(values.base, values.head)
        } catch (err) {
            process.stderr.write(`error: git diff failed: ${err.message}\n`)
            return 1
        }
        result = resolveAffected(changedFiles)
    } else {
        return fail('provide one of --all, --files, or --base/--head')
    }

    if (values.json) {
        process.stdout.write(
            JSON.stringify(
                {
                    suites: result.suites,
                    reasons: result.reasons,
                    changedFiles: result.changedFiles,
                },
                null,
                2,
            ) + '\n',
        )
        return 0
    }

    process.stdout.write(formatReasonTable(result))
    writeGithubOutput(result.suites)
    writeStepSummary(result)
    return 0
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exit(main(process.argv.slice(2)))
}
