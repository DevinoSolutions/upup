import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
    DIST_PACKAGES,
    FRAMEWORKS,
    buildTsconfig,
    buildUpupPaths,
    classifyResult,
    detectMissingDist,
    frameworkExtraPaths,
    resolveToolBin,
    runAll,
} from './check-snippets.mjs'

const byName = name => FRAMEWORKS.find(f => f.framework === name)

test('buildUpupPaths maps all seven @upupjs packages to their built dist entry', () => {
    const paths = buildUpupPaths()
    assert.equal(Object.keys(paths).length, DIST_PACKAGES.length)
    for (const pkg of DIST_PACKAGES) {
        assert.deepEqual(paths[`@upupjs/${pkg}`], [
            `packages/${pkg}/dist/index.d.ts`,
        ])
    }
})

test('react-runtime frameworks map react + both jsx runtimes to the package @types/react', () => {
    const extra = frameworkExtraPaths(byName('preact'))
    assert.deepEqual(extra.react, ['packages/preact/node_modules/@types/react'])
    assert.deepEqual(extra['react/jsx-runtime'], [
        'packages/preact/node_modules/@types/react/jsx-runtime',
    ])
    assert.deepEqual(extra['react/jsx-dev-runtime'], [
        'packages/preact/node_modules/@types/react/jsx-dev-runtime',
    ])
})

test('non-react runtimes each map only their own framework core module', () => {
    assert.deepEqual(frameworkExtraPaths(byName('vue')), {
        vue: ['packages/vue/node_modules/vue'],
    })
    assert.deepEqual(frameworkExtraPaths(byName('svelte')), {
        svelte: ['packages/svelte/node_modules/svelte'],
    })
    assert.deepEqual(frameworkExtraPaths(byName('angular')), {
        '@angular/core': ['packages/angular/node_modules/@angular/core'],
    })
    assert.deepEqual(frameworkExtraPaths(byName('vanilla')), {})
})

test('buildTsconfig computes a repo-root-relative baseUrl from the harness location', () => {
    const cfg = buildTsconfig(byName('react'), {
        repoRoot: '/repo',
        frameworkDir: '/repo/scripts/docs/.snippet-harness/react',
    })
    assert.equal(cfg.compilerOptions.baseUrl, '../../../..')
})

test('buildTsconfig pins react-jsx with the react JSX source for react snippets', () => {
    const cfg = buildTsconfig(byName('react'), {
        repoRoot: '/repo',
        frameworkDir: '/repo/h/react',
    })
    assert.equal(cfg.compilerOptions.jsx, 'react-jsx')
    assert.equal(cfg.compilerOptions.jsxImportSource, 'react')
    assert.ok(cfg.include.includes('snippet-env.d.ts'))
})

test('buildTsconfig gives the preact snippet the same react JSX contract as react', () => {
    // @upupjs/preact re-exports @upupjs/react, so the snippet is React-typed.
    const cfg = buildTsconfig(byName('preact'), {
        repoRoot: '/repo',
        frameworkDir: '/repo/h/preact',
    })
    assert.equal(cfg.compilerOptions.jsx, 'react-jsx')
    assert.equal(cfg.compilerOptions.jsxImportSource, 'react')
})

test('buildTsconfig enables decorator support and omits the styles env for angular', () => {
    const cfg = buildTsconfig(byName('angular'), {
        repoRoot: '/repo',
        frameworkDir: '/repo/h/angular',
    })
    assert.equal(cfg.compilerOptions.experimentalDecorators, true)
    assert.equal(cfg.compilerOptions.useDefineForClassFields, false)
    assert.equal(cfg.compilerOptions.target, 'ES2022')
    assert.equal(cfg.include.includes('snippet-env.d.ts'), false)
})

test('buildTsconfig selects vue jsx preserve with the vue JSX source', () => {
    const cfg = buildTsconfig(byName('vue'), {
        repoRoot: '/repo',
        frameworkDir: '/repo/h/vue',
    })
    assert.equal(cfg.compilerOptions.jsx, 'preserve')
    assert.equal(cfg.compilerOptions.jsxImportSource, 'vue')
})

test('detectMissingDist reports every framework dist absent under an empty root', () => {
    const empty = mkdtempSync(join(tmpdir(), 'upup-snip-empty-'))
    const missing = detectMissingDist(empty)
    assert.equal(missing.length, DIST_PACKAGES.length)
})

test('detectMissingDist reports nothing when every dist entry is present', () => {
    const root = mkdtempSync(join(tmpdir(), 'upup-snip-dist-'))
    for (const pkg of DIST_PACKAGES) {
        const dir = join(root, 'packages', pkg, 'dist')
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'index.d.ts'), 'export {}\n')
    }
    assert.deepEqual(detectMissingDist(root), [])
})

test('classifyResult treats a non-zero compiler exit as a snippet failure', () => {
    assert.equal(classifyResult({ exitCode: 2, tool: 'tsc' }).status, 'fail')
    assert.equal(classifyResult({ exitCode: 0, tool: 'tsc' }).status, 'ok')
})

test('classifyResult fails svelte-check that exits zero but reports errors in output', () => {
    const reported = classifyResult({
        exitCode: 0,
        stdout: 'svelte-check found 2 errors and 0 warnings',
        tool: 'svelte-check',
    })
    assert.equal(reported.status, 'fail')
    const clean = classifyResult({
        exitCode: 0,
        stdout: 'svelte-check found 0 errors and 0 warnings',
        tool: 'svelte-check',
    })
    assert.equal(clean.status, 'ok')
})

test('resolveToolBin locates a workspace tsc and returns null for an unknown tool', () => {
    assert.ok(
        resolveToolBin('tsc', 'react'),
        'expected a resolvable tsc binary',
    )
    assert.equal(resolveToolBin('nonexistent-tool', 'react'), null)
})

test('the real registry compiles under every framework when the dist is built', () => {
    if (detectMissingDist().length > 0) {
        console.log(
            'SKIP (skip-green): built dist absent — run `pnpm build` to exercise the real compile harness',
        )
        return
    }
    const { missingDist, results } = runAll()
    assert.deepEqual(missingDist, [])
    assert.equal(results.length, FRAMEWORKS.length)
    const failed = results.filter(r => r.status !== 'ok')
    assert.deepEqual(
        failed.map(r => `${r.framework}: ${r.output}`),
        [],
        'every canonical snippet must compile clean',
    )
})
