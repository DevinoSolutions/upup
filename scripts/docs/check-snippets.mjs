#!/usr/bin/env node

/**
 * Docs snippet compile gate (`docs:snippets:check`).
 *
 * Usage:
 *   node scripts/docs/check-snippets.mjs
 *
 * Typechecks every canonical framework snippet under
 * apps/landing/content/docs/_snippets/ against the BUILT workspace packages
 * (packages consume each other's dist/, so the snippet resolves exactly what a
 * published consumer would). Standalone node CLI; the only runtime deps are
 * the per-framework compilers already installed in the workspace.
 *
 * Toolchain per framework:
 *   react / preact / next / vanilla / angular  →  tsc --noEmit
 *   vue                                        →  vue-tsc --noEmit
 *   svelte                                     →  svelte-check
 *
 * Module resolution (validated empirically against the built dist):
 *   - Each `@upupjs/<pkg>` maps by `paths` to packages/<pkg>/dist/index.d.ts.
 *     Deep imports *inside* those .d.ts files (react, @upupjs/core, …) resolve
 *     relative to the dist file via the package's own node_modules, so only
 *     the specifiers the SNIPPET writes directly need explicit `paths`.
 *   - react / preact / next: the snippet's own JSX needs React's runtime +
 *     JSX namespace, so `react` (and its jsx-runtime) map to the package's
 *     @types/react. jsx=react-jsx / jsxImportSource=react.
 *       WHY react-jsx for PREACT: @upupjs/preact's dist is literally
 *       `export * from '@upupjs/react'` — a compat re-export — so the exported
 *       component and props carry REACT's types. The consumer snippet therefore
 *       typechecks against React's JSX runtime, not preact's. (A real preact
 *       app aliases react→preact/compat at build time; that swaps the runtime,
 *       not the type surface the snippet is checked against.) Using preact's
 *       jsxImportSource here would type the JSX namespace against preact while
 *       the component is React-typed — the wrong contract to pin.
 *   - vue: jsx=preserve / jsxImportSource=vue (mirrors packages/vue).
 *   - `@upupjs/<pkg>/styles` imports are CSS — tsc cannot typecheck them, so a
 *     generated snippet-env.d.ts declares them as ambient modules.
 *
 * BUILT dist must already exist — this gate does NOT build. If a mapped dist is
 * missing it errors out telling you to run `pnpm build` first. Compiler errors
 * print VERBATIM with framework + file so "the snippet is wrong" is
 * distinguishable from "the API changed".
 *
 * Exit non-zero if any snippet fails; a clean run prints per-framework ok lines.
 */

import { spawnSync } from 'node:child_process'
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    rmSync,
    writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../..')
const DEFAULT_SNIPPETS_DIR = resolve(
    REPO_ROOT,
    'apps/landing/content/docs/_snippets/getting-started',
)
const DEFAULT_HARNESS_DIR = resolve(HERE, '.snippet-harness')

// The seven framework packages whose built dist the harness maps.
export const DIST_PACKAGES = [
    'react',
    'vue',
    'svelte',
    'angular',
    'vanilla',
    'preact',
    'next',
]

// Per-framework snippet + toolchain descriptor.
// runtime selects the extra `paths` + jsx settings the snippet needs.
export const FRAMEWORKS = [
    {
        framework: 'react',
        file: 'react.tsx',
        pkg: 'react',
        tool: 'tsc',
        runtime: 'react',
        styles: true,
    },
    {
        framework: 'vue',
        file: 'vue.vue',
        pkg: 'vue',
        tool: 'vue-tsc',
        runtime: 'vue',
        styles: true,
    },
    {
        framework: 'svelte',
        file: 'svelte.svelte',
        pkg: 'svelte',
        tool: 'svelte-check',
        runtime: 'svelte',
        styles: true,
    },
    {
        framework: 'angular',
        file: 'angular.ts',
        pkg: 'angular',
        tool: 'tsc',
        runtime: 'angular',
        styles: false,
    },
    {
        framework: 'vanilla',
        file: 'vanilla.ts',
        pkg: 'vanilla',
        tool: 'tsc',
        runtime: 'none',
        styles: true,
    },
    {
        framework: 'preact',
        file: 'preact.tsx',
        pkg: 'preact',
        tool: 'tsc',
        runtime: 'react',
        styles: true,
    },
    {
        framework: 'next',
        file: 'next.tsx',
        pkg: 'next',
        tool: 'tsc',
        runtime: 'react',
        styles: true,
    },
]

const toPosix = p => p.replace(/\\/g, '/')

// ── Pure helpers (unit-tested) ───────────────────────────────────────────────

/** `@upupjs/<pkg>` → built dist type entry, for every framework package. */
export function buildUpupPaths() {
    const paths = {}
    for (const pkg of DIST_PACKAGES) {
        paths[`@upupjs/${pkg}`] = [`packages/${pkg}/dist/index.d.ts`]
    }
    return paths
}

/** Runtime specifiers the snippet writes directly (JSX runtime, framework core). */
export function frameworkExtraPaths(fw) {
    switch (fw.runtime) {
        case 'react': {
            const types = `packages/${fw.pkg}/node_modules/@types/react`
            return {
                react: [types],
                'react/jsx-runtime': [`${types}/jsx-runtime`],
                'react/jsx-dev-runtime': [`${types}/jsx-dev-runtime`],
            }
        }
        case 'vue':
            return { vue: ['packages/vue/node_modules/vue'] }
        case 'svelte':
            return { svelte: ['packages/svelte/node_modules/svelte'] }
        case 'angular':
            return {
                '@angular/core': [
                    'packages/angular/node_modules/@angular/core',
                ],
            }
        default:
            return {}
    }
}

/**
 * Full tsconfig object for a framework's harness dir. Pure — the paths are
 * repo-root-relative strings and baseUrl is computed from the harness location,
 * so this is fully assertable without touching the filesystem.
 */
export function buildTsconfig(fw, { repoRoot, frameworkDir }) {
    const baseUrl = toPosix(relative(frameworkDir, repoRoot)) || '.'
    const isAngular = fw.runtime === 'angular'
    const compilerOptions = {
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        esModuleInterop: true,
        moduleResolution: 'bundler',
        module: 'ESNext',
        target: isAngular ? 'ES2022' : 'ES2020',
        lib: isAngular
            ? ['ES2022', 'DOM', 'DOM.Iterable']
            : ['ES2020', 'DOM', 'DOM.Iterable'],
        baseUrl,
        paths: { ...buildUpupPaths(), ...frameworkExtraPaths(fw) },
    }
    if (fw.runtime === 'react') {
        compilerOptions.jsx = 'react-jsx'
        compilerOptions.jsxImportSource = 'react'
    } else if (fw.runtime === 'vue') {
        compilerOptions.jsx = 'preserve'
        compilerOptions.jsxImportSource = 'vue'
    } else if (fw.runtime === 'svelte') {
        compilerOptions.isolatedModules = true
        compilerOptions.resolveJsonModule = true
        compilerOptions.verbatimModuleSyntax = false
    } else if (isAngular) {
        compilerOptions.experimentalDecorators = true
        compilerOptions.useDefineForClassFields = false
    }
    const include = [fw.file]
    if (fw.styles) include.push('snippet-env.d.ts')
    return { compilerOptions, include }
}

/** dist type entries a run depends on but that are not present yet. */
export function detectMissingDist(repoRoot = REPO_ROOT) {
    return DIST_PACKAGES.map(pkg =>
        join(repoRoot, 'packages', pkg, 'dist', 'index.d.ts'),
    ).filter(p => !existsSync(p))
}

/**
 * Classify a compiler invocation. svelte-check can exit 0 with reported
 * errors in some configurations, so its output is also scanned.
 */
export function classifyResult({ exitCode, stdout = '', stderr = '', tool }) {
    const output = `${stdout}${stderr}`.trim()
    let failed = exitCode !== 0
    if (tool === 'svelte-check' && /found [1-9]\d* error/.test(output)) {
        failed = true
    }
    return { status: failed ? 'fail' : 'ok', output }
}

// ── Tool resolution ──────────────────────────────────────────────────────────

const first = candidates => candidates.find(c => existsSync(c)) ?? null

export function resolveToolBin(tool, pkg, repoRoot = REPO_ROOT) {
    const p = (...s) => join(repoRoot, ...s)
    if (tool === 'tsc') {
        // Prefer the framework's own typescript; fall back to any workspace one.
        const pkgOrder = [pkg, ...DIST_PACKAGES]
        const candidates = pkgOrder
            .map(name =>
                p('packages', name, 'node_modules', 'typescript', 'bin', 'tsc'),
            )
            .concat([
                p(
                    'apps',
                    'landing',
                    'node_modules',
                    'typescript',
                    'bin',
                    'tsc',
                ),
            ])
        return first(candidates)
    }
    if (tool === 'vue-tsc') {
        return first([
            p(
                'packages',
                'vue',
                'node_modules',
                'vue-tsc',
                'bin',
                'vue-tsc.js',
            ),
        ])
    }
    if (tool === 'svelte-check') {
        return first([
            p(
                'packages',
                'svelte',
                'node_modules',
                'svelte-check',
                'bin',
                'svelte-check',
            ),
        ])
    }
    return null
}

// ── Harness scaffolding + execution ──────────────────────────────────────────

function scaffold(fw, { repoRoot, snippetsDir, harnessDir }) {
    const frameworkDir = join(harnessDir, fw.framework)
    rmSync(frameworkDir, { recursive: true, force: true })
    mkdirSync(frameworkDir, { recursive: true })

    copyFileSync(join(snippetsDir, fw.file), join(frameworkDir, fw.file))

    const tsconfig = buildTsconfig(fw, { repoRoot, frameworkDir })
    writeFileSync(
        join(frameworkDir, 'tsconfig.json'),
        `${JSON.stringify(tsconfig, null, 2)}\n`,
    )

    if (fw.styles) {
        writeFileSync(
            join(frameworkDir, 'snippet-env.d.ts'),
            `declare module '@upupjs/${fw.pkg}/styles'\n`,
        )
    }
    if (fw.tool === 'svelte-check') {
        // Minimal svelte workspace: config for preprocessing + a typed
        // package.json to silence the ESM module-type warning.
        writeFileSync(
            join(frameworkDir, 'svelte.config.js'),
            'export default {}\n',
        )
        writeFileSync(
            join(frameworkDir, 'package.json'),
            `${JSON.stringify({ type: 'module' }, null, 2)}\n`,
        )
    }
    return frameworkDir
}

function runFramework(fw, { repoRoot, snippetsDir, harnessDir }) {
    const bin = resolveToolBin(fw.tool, fw.pkg, repoRoot)
    if (!bin) {
        return {
            framework: fw.framework,
            status: 'fail',
            output: `could not resolve the ${fw.tool} binary in the workspace`,
        }
    }
    const frameworkDir = scaffold(fw, { repoRoot, snippetsDir, harnessDir })
    const tsconfigPath = join(frameworkDir, 'tsconfig.json')

    const args =
        fw.tool === 'svelte-check'
            ? [
                  '--workspace',
                  frameworkDir,
                  '--tsconfig',
                  './tsconfig.json',
                  '--output',
                  'human',
              ]
            : ['--noEmit', '-p', tsconfigPath]

    const proc = spawnSync('node', [bin, ...args], {
        cwd: frameworkDir,
        encoding: 'utf8',
    })
    const { status, output } = classifyResult({
        exitCode: proc.status ?? 1,
        stdout: proc.stdout,
        stderr: proc.stderr,
        tool: fw.tool,
    })
    return { framework: fw.framework, file: fw.file, status, output }
}

/**
 * Run every framework snippet. Sequential (each spawns its own compiler).
 * @returns {{missingDist: string[], results: Array<{framework,file,status,output}>}}
 */
export function runAll(opts = {}) {
    const repoRoot = opts.repoRoot ?? REPO_ROOT
    const snippetsDir = opts.snippetsDir ?? DEFAULT_SNIPPETS_DIR
    const harnessDir = opts.harnessDir ?? DEFAULT_HARNESS_DIR

    const missingDist = detectMissingDist(repoRoot)
    if (missingDist.length > 0) return { missingDist, results: [] }

    const results = []
    for (const fw of FRAMEWORKS) {
        results.push(runFramework(fw, { repoRoot, snippetsDir, harnessDir }))
    }
    return { missingDist, results }
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function main() {
    const { missingDist, results } = runAll()

    if (missingDist.length > 0) {
        console.error(
            'docs:snippets:check FAILED — built dist missing; run `pnpm build` first:\n',
        )
        for (const p of missingDist) {
            console.error(`  ${relative(REPO_ROOT, p)}`)
        }
        process.exit(1)
    }

    const failures = results.filter(r => r.status === 'fail')
    for (const r of results) {
        if (r.status === 'ok') {
            console.log(`docs:snippets:check OK — ${r.framework} (${r.file})`)
        }
    }
    if (failures.length > 0) {
        console.error(
            `\ndocs:snippets:check FAILED — ${failures.length} snippet(s) do not compile:\n`,
        )
        for (const r of failures) {
            console.error(`  [${r.framework}] ${r.file}`)
            console.error(
                r.output
                    .split('\n')
                    .map(l => `    ${l}`)
                    .join('\n'),
            )
            console.error('')
        }
        process.exit(1)
    }
    console.log(
        `\ndocs:snippets:check OK — all ${results.length} framework snippets compile`,
    )
}

if (
    import.meta.url === `file://${process.argv[1]}` ||
    process.argv[1] === fileURLToPath(import.meta.url)
) {
    main()
}
