import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    SUITES,
    IMPACT_RULES,
    resolveFile,
    resolveAffected,
} from './resolve-affected-tests.mjs'

const SCRIPT = fileURLToPath(
    new URL('./resolve-affected-tests.mjs', import.meta.url),
)

/** Run the CLI in a child process; never throws on nonzero exit. */
function runCli(args, env = {}) {
    return spawnSync(process.execPath, [SCRIPT, ...args], {
        encoding: 'utf8',
        env: { ...process.env, ...env },
    })
}

// ── resolveFile: targeted rules ────────────────────────────────────────────

const TARGETED_CASES = [
    {
        name: 'a core src change triggers e2e, minio, and smoke because every heavy suite consumes @upup/core',
        path: 'packages/core/src/upload/pipeline.ts',
        suites: ['e2e', 'minio', 'smoke'],
    },
    {
        name: 'a server src change triggers e2e, minio, and smoke because its integration tests need real MinIO',
        path: 'packages/server/src/handler.ts',
        suites: ['e2e', 'minio', 'smoke'],
    },
    {
        name: 'a react UI change triggers e2e and smoke but not minio because a UI port needs no storage backend',
        path: 'packages/react/src/UpupUploader.tsx',
        suites: ['e2e', 'smoke'],
    },
    {
        name: 'a next package change triggers e2e and smoke because it re-exports the UI and ships route handlers',
        path: 'packages/next/src/server/app-router.ts',
        suites: ['e2e', 'smoke'],
    },
    {
        name: 'a storybook-config change triggers only e2e because it feeds the parity harness, not uploads',
        path: 'packages/storybook-config/src/preview.ts',
        suites: ['e2e'],
    },
    {
        name: 'a storybook app change triggers only e2e because it is a cross-framework parity project',
        path: 'apps/storybook-vue/.storybook/main.ts',
        suites: ['e2e'],
    },
    {
        name: 'an e2e-test harness change triggers e2e and minio because the Playwright suite drives real uploads',
        path: 'apps/e2e-test/cross-framework/parity.spec.ts',
        suites: ['e2e', 'minio'],
    },
    {
        name: 'a docker-compose change triggers e2e and minio because it provisions the MinIO backend',
        path: 'docker-compose.yml',
        suites: ['e2e', 'minio'],
    },
    {
        name: 'a local-dev env change triggers e2e and minio because it holds the MinIO credentials',
        path: 'local-dev/.env.minio.example',
        suites: ['e2e', 'minio'],
    },
    {
        name: 'the e2e server helper triggers e2e and minio because it bridges browser uploads to storage',
        path: 'scripts/upup-e2e-server.mjs',
        suites: ['e2e', 'minio'],
    },
    {
        name: 'the env validator triggers e2e and minio because it guards the MinIO env schema',
        path: 'scripts/validate-env.mjs',
        suites: ['e2e', 'minio'],
    },
    {
        name: 'the smoke consumer script triggers only smoke because it packs and consumes real tarballs',
        path: 'scripts/package-smoke-consumer.mjs',
        suites: ['smoke'],
    },
    {
        name: 'a scripts/lib change triggers only smoke because the tarball reader backs the consumer',
        path: 'scripts/lib/tarball.mjs',
        suites: ['smoke'],
    },
]

for (const testCase of TARGETED_CASES) {
    test(testCase.name, () => {
        assert.deepEqual(resolveFile(testCase.path).suites, testCase.suites)
    })
}

test('every framework UI package triggers exactly e2e and smoke because the parity harness and tarball consumer both exercise it', () => {
    for (const framework of [
        'react',
        'vue',
        'svelte',
        'angular',
        'vanilla',
        'preact',
        'next',
    ]) {
        const resolved = resolveFile(`packages/${framework}/src/index.ts`)
        assert.deepEqual(
            resolved.suites,
            ['e2e', 'smoke'],
            `expected ${framework} to route to e2e+smoke`,
        )
    }
})

// ── resolveFile: universal tier ────────────────────────────────────────────

const UNIVERSAL_CASES = [
    {
        name: 'a root package.json edit is universal because a dependency or script change can reach any package',
        path: 'package.json',
    },
    {
        name: 'a pnpm-lock edit is universal because a resolved-dependency change can reach every suite',
        path: 'pnpm-lock.yaml',
    },
    {
        name: 'a turbo.json edit is universal because the task graph drives every build and test',
        path: 'turbo.json',
    },
    {
        name: 'an nvmrc edit is universal because a Node version bump can break any package',
        path: '.nvmrc',
    },
    {
        name: 'a workflow edit is universal because changing CI itself invalidates every routing assumption',
        path: '.github/workflows/e2e.yml',
    },
    {
        name: 'a scripts/ci edit is universal because the resolver itself decides all routing',
        path: 'scripts/ci/resolve-affected-tests.mjs',
    },
    {
        name: 'a shared eslint-config edit is universal because the lint factory feeds every package',
        path: 'packages/eslint-config/index.mjs',
    },
    {
        name: 'a shared tailwind-config edit is universal because the theme factory feeds every package',
        path: 'packages/tailwind-config/postcss.config.cjs',
    },
    {
        name: 'a vitest config edit anywhere is universal because test infrastructure changes invalidate routing assumptions',
        path: 'packages/react/vitest.config.ts',
    },
    {
        name: 'a nested tsconfig edit is universal because compiler settings can change any package build',
        path: 'packages/vue/tsconfig.build.json',
    },
    {
        name: 'a playwright config edit is universal because it defines the whole e2e project matrix',
        path: 'apps/e2e-test/playwright.crossframework.config.ts',
    },
    {
        name: 'a size-limit budget edit is universal because bundle budgets gate every publishable package',
        path: '.size-limit.json',
    },
    {
        name: 'an oxlint config edit is universal because the fast lint pass covers the whole workspace',
        path: '.oxlintrc.json',
    },
]

for (const testCase of UNIVERSAL_CASES) {
    test(testCase.name, () => {
        const resolved = resolveFile(testCase.path)
        assert.equal(resolved.tier, 'universal')
        assert.deepEqual(resolved.suites, ['e2e', 'minio', 'smoke'])
    })
}

// ── resolveFile: light tiers ───────────────────────────────────────────────

const LIGHT_CASES = [
    {
        name: 'a README edit inside packages/core stays light because markdown cannot change runtime behavior',
        path: 'packages/core/README.md',
    },
    {
        name: 'a top-level docs change stays light because documentation has no runtime surface',
        path: 'docs/testing.md',
    },
    {
        name: 'a playground app change stays light because its deep suite runs locally, not in the PR gate',
        path: 'apps/playground/src/App.tsx',
    },
    {
        name: 'a landing app change stays light because the marketing site is outside the test gates',
        path: 'apps/landing/src/routes/index.astro',
    },
    {
        name: 'a next-example app change stays light because the demo app ships nothing the gate consumes',
        path: 'apps/next-example/app/page.tsx',
    },
    {
        name: 'an interactive-example change stays light because the private demo package is not gated',
        path: 'packages/interactive-example/src/ai/localAssistant.ts',
    },
    {
        name: 'a dependabot config change stays light because non-workflow github metadata cannot alter suite outcomes',
        path: '.github/dependabot.yml',
    },
    {
        name: 'an issue-template change stays light because github metadata has no runtime effect',
        path: '.github/ISSUE_TEMPLATE/bug.yml',
    },
    {
        name: 'a LICENSE edit stays light because legal text has no runtime effect',
        path: 'LICENSE',
    },
    {
        name: 'a husky hook change stays light because git hooks do not change suite outcomes',
        path: '.husky/pre-commit',
    },
]

for (const testCase of LIGHT_CASES) {
    test(testCase.name, () => {
        assert.deepEqual(resolveFile(testCase.path).suites, [])
    })
}

// ── resolveFile: precedence subtleties ─────────────────────────────────────

test('a config basename outranks the package rule so a package vitest config still runs everything', () => {
    const resolved = resolveFile('packages/svelte/vitest.config.ts')
    assert.equal(resolved.tier, 'universal')
    assert.deepEqual(resolved.suites, ['e2e', 'minio', 'smoke'])
})

test('the markdown carve-out outranks a directory-targeted rule so a package README skips every suite', () => {
    const resolved = resolveFile('packages/server/docs/architecture.md')
    assert.equal(resolved.tier, 'light-doc')
    assert.deepEqual(resolved.suites, [])
})

test('a universal shared factory outranks the markdown carve-out so its README still runs everything', () => {
    const resolved = resolveFile('packages/eslint-config/README.md')
    assert.equal(resolved.tier, 'universal')
    assert.deepEqual(resolved.suites, ['e2e', 'minio', 'smoke'])
})

test("a package's own package.json routes to that package's targeted suites, because only the ROOT manifest is universal", () => {
    const pkg = resolveFile('packages/react/package.json')
    assert.equal(pkg.tier, 'targeted')
    assert.deepEqual(pkg.suites, ['e2e', 'smoke'])

    const root = resolveFile('package.json')
    assert.equal(root.tier, 'universal')
    assert.deepEqual(root.suites, ['e2e', 'minio', 'smoke'])
})

// ── resolveFile: fail-open ─────────────────────────────────────────────────

test('an unmatched novel package path fails open to every suite so a new directory can never silently skip coverage', () => {
    const resolved = resolveFile('packages/brand-new-thing/src/index.ts')
    assert.equal(resolved.tier, 'fail-open')
    assert.deepEqual(resolved.suites, ['e2e', 'minio', 'smoke'])
})

test('an unmatched novel root file fails open to every suite because an unknown path is treated as high risk', () => {
    const resolved = resolveFile('renovate.toml')
    assert.equal(resolved.tier, 'fail-open')
    assert.deepEqual(resolved.suites, ['e2e', 'minio', 'smoke'])
})

// ── resolveAffected: changeset behavior ────────────────────────────────────

test('an empty diff runs no suite because there is nothing to verify', () => {
    const result = resolveAffected([])
    assert.deepEqual(result.suites, { e2e: false, minio: false, smoke: false })
    for (const suite of SUITES) {
        assert.equal(result.reasons[suite], 'no changed files')
    }
})

test('the force-all flag runs every suite because a manual dispatch opts out of routing', () => {
    const result = resolveAffected([], { forceAll: true })
    assert.deepEqual(result.suites, { e2e: true, minio: true, smoke: true })
    for (const suite of SUITES) {
        assert.equal(
            result.reasons[suite],
            'forced (--all / workflow_dispatch)',
        )
    }
})

test('a mixed changeset unions suites across files so a docs tweak beside a core change still runs the heavy suites', () => {
    const result = resolveAffected([
        'packages/core/src/core.ts',
        'README.md',
        'packages/react/src/UpupUploader.tsx',
    ])
    assert.deepEqual(result.suites, { e2e: true, minio: true, smoke: true })
})

test('a changeset of only light files runs no suite because none of them affect a heavy suite', () => {
    const result = resolveAffected(['README.md', 'apps/playground/src/App.tsx'])
    assert.deepEqual(result.suites, { e2e: false, minio: false, smoke: false })
    for (const suite of SUITES) {
        assert.equal(
            result.reasons[suite],
            'skipped — no changed file affects this suite',
        )
    }
})

test('a UI-only changeset runs e2e and smoke but skips minio, and the skip reason explains why', () => {
    const result = resolveAffected(['packages/vue/src/UpupUploader.vue'])
    assert.deepEqual(result.suites, { e2e: true, minio: false, smoke: true })
    assert.match(result.reasons.e2e, /packages\/vue/)
    assert.equal(
        result.reasons.minio,
        'skipped — no changed file affects this suite',
    )
})

test('an unmatched file is recorded in the fail-open list so reviewers can see coverage was forced, not chosen', () => {
    const result = resolveAffected([
        'packages/core/src/core.ts',
        'some-unknown-thing.bin',
    ])
    assert.deepEqual(result.unmatched, ['some-unknown-thing.bin'])
    assert.deepEqual(result.suites, { e2e: true, minio: true, smoke: true })
})

// ── Impact map data shape ──────────────────────────────────────────────────

test('every impact rule exposes a name, a known tier, a callable test, and a valid suites value so the data stays a safe wrapper target', () => {
    const knownTiers = new Set([
        'universal',
        'light-doc',
        'targeted',
        'light-dir',
    ])
    for (const rule of IMPACT_RULES) {
        assert.equal(typeof rule.name, 'string')
        assert.ok(knownTiers.has(rule.tier), `unknown tier: ${rule.tier}`)
        assert.equal(typeof rule.test, 'function')
        if (rule.tier === 'universal') {
            assert.equal(rule.suites, 'ALL')
        } else if (rule.tier === 'targeted') {
            assert.ok(Array.isArray(rule.suites))
            for (const suite of rule.suites) assert.ok(SUITES.includes(suite))
        } else {
            assert.equal(rule.suites, 'NONE')
        }
    }
})

// ── CLI surface ────────────────────────────────────────────────────────────

test('the CLI writes GitHub Actions outputs to GITHUB_OUTPUT so the workflow can gate downstream jobs on the result', () => {
    const dir = mkdtempSync(join(tmpdir(), 'affected-out-'))
    const outFile = join(dir, 'gh-output')
    const result = runCli(['--files', 'packages/core/src/core.ts'], {
        GITHUB_OUTPUT: outFile,
    })
    assert.equal(result.status, 0, result.stderr)
    const written = readFileSync(outFile, 'utf8')
    assert.match(written, /^e2e=true$/m)
    assert.match(written, /^minio=true$/m)
    assert.match(written, /^smoke=true$/m)
})

test('the CLI records false outputs for a light-only changeset so a skipped suite is explicit, not absent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'affected-out-'))
    const outFile = join(dir, 'gh-output')
    const result = runCli(['--files', 'packages/react/src/UpupUploader.tsx'], {
        GITHUB_OUTPUT: outFile,
    })
    assert.equal(result.status, 0, result.stderr)
    const written = readFileSync(outFile, 'utf8')
    assert.match(written, /^e2e=true$/m)
    assert.match(written, /^minio=false$/m)
    assert.match(written, /^smoke=true$/m)
})

test('the CLI emits a parseable JSON document under --json so other tooling can consume the routing decision', () => {
    const result = runCli(['--json', '--files', 'packages/svelte/src/x.ts'])
    assert.equal(result.status, 0, result.stderr)
    const parsed = JSON.parse(result.stdout)
    assert.deepEqual(parsed.suites, { e2e: true, minio: false, smoke: true })
    assert.equal(typeof parsed.reasons.e2e, 'string')
    assert.deepEqual(parsed.changedFiles, ['packages/svelte/src/x.ts'])
})

test('the CLI accepts comma-joined files in a single flag so a workflow can pass one interpolated string', () => {
    const result = runCli([
        '--json',
        '--files',
        'packages/core/src/a.ts,docs/readme.md',
    ])
    assert.equal(result.status, 0, result.stderr)
    const parsed = JSON.parse(result.stdout)
    assert.deepEqual(parsed.changedFiles, [
        'packages/core/src/a.ts',
        'docs/readme.md',
    ])
    assert.deepEqual(parsed.suites, { e2e: true, minio: true, smoke: true })
})

test('the CLI leaves GITHUB_OUTPUT untouched under --json because JSON mode is for ad-hoc consumers, not the gate', () => {
    const dir = mkdtempSync(join(tmpdir(), 'affected-out-'))
    const outFile = join(dir, 'gh-output')
    const result = runCli(['--json', '--files', 'packages/core/src/core.ts'], {
        GITHUB_OUTPUT: outFile,
    })
    assert.equal(result.status, 0, result.stderr)
    assert.throws(() => readFileSync(outFile, 'utf8'), /ENOENT/)
})

test('the CLI forces every suite under --all so a manual re-run can bypass routing entirely', () => {
    const result = runCli(['--all', '--json'])
    assert.equal(result.status, 0, result.stderr)
    const parsed = JSON.parse(result.stdout)
    assert.deepEqual(parsed.suites, { e2e: true, minio: true, smoke: true })
})

test('the CLI exits nonzero on a half-specified git range because a missing --head is an operational error, not a skip', () => {
    const result = runCli(['--base', 'HEAD~1'])
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /--base and --head/)
})

test('the CLI exits nonzero when given no mode at all because silently running nothing would hide coverage gaps', () => {
    const result = runCli([])
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /--all, --files, or --base\/--head/)
})

test('the CLI computes an affected set from real git history so the git-diff path is exercised end to end', () => {
    const result = runCli(['--json', '--base', 'HEAD~1', '--head', 'HEAD'])
    assert.equal(result.status, 0, result.stderr)
    const parsed = JSON.parse(result.stdout)
    assert.ok(Array.isArray(parsed.changedFiles))
    assert.ok('e2e' in parsed.suites)
    assert.ok('minio' in parsed.suites)
    assert.ok('smoke' in parsed.suites)
})
