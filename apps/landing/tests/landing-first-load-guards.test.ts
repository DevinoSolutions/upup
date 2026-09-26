import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Ratchet for the 2026-09 landing mobile-performance pass. Three libraries used
// to ride the home page's first load through ordinary-looking static imports:
//
//   1. zod (~90 KB compressed) — client components read NEXT_PUBLIC_* values
//      through `@/lib/env`, which parses them with a zod schema.
//   2. posthog-js (~95 KB) — the root-layout provider imported it statically.
//   3. framer-motion's full feature set — any `motion.*` element bundles it;
//      the slim `m.*` elements get their features from MotionProvider's async
//      chunk instead.
//
// None of this is visible to a type checker, so the sources are read as text.

const SRC = fileURLToPath(new URL('../src/', import.meta.url))

function read(rel: string): string {
    return readFileSync(join(SRC, rel), 'utf8')
}

function walk(dir: string): string[] {
    return readdirSync(dir).flatMap(name => {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) return walk(full)
        return /\.(tsx?|jsx?)$/.test(name) ? [full] : []
    })
}

/** Value imports of `pkg` (type-only imports are erased and cost nothing). */
function valueImportsOf(source: string, pkg: string): string[] {
    const re = new RegExp(
        `import\\s+(?!type\\b)[^;]*?from\\s+['"]${pkg.replace('/', '\\/')}['"]`,
        'g',
    )
    return source.match(re) ?? []
}

describe('landing first-load guards', () => {
    it('client-side env and the analytics dataset never import zod or the server env', () => {
        for (const rel of ['lib/client/env.ts', 'lib/analytics/dataset.ts']) {
            const source = read(rel)
            expect(valueImportsOf(source, 'zod'), rel).toEqual([])
            expect(source, rel).not.toMatch(/from ['"]@\/lib\/env['"]/)
        }
    })

    it('client components read NEXT_PUBLIC_* values from the zod-free module', () => {
        const offenders = walk(SRC)
            .filter(file =>
                /^['"]use client['"]/m.test(readFileSync(file, 'utf8')),
            )
            .filter(file =>
                /from ['"]@\/lib\/env['"]/.test(readFileSync(file, 'utf8')),
            )
            .map(file => relative(SRC, file))
        expect(offenders).toEqual([])
    })

    it('nothing in the root layout graph imports posthog-js as a value', () => {
        for (const rel of [
            'components/posthog-provider.tsx',
            'lib/analytics/capture.client.ts',
            'lib/analytics/posthog-client.ts',
            'components/InteractiveExampleClient.tsx',
        ])
            expect(valueImportsOf(read(rel), 'posthog-js'), rel).toEqual([])
    })

    it('landing components use framer-motion m.* (never motion.*) under MotionProvider', () => {
        const offenders = walk(join(SRC, 'components'))
            .filter(
                file =>
                    !relative(SRC, file).startsWith(join('components', 'docs')),
            )
            .filter(file => {
                const source = readFileSync(file, 'utf8')
                const imports = source.match(
                    /import\s*\{([^}]*)\}\s*from\s*['"]framer-motion['"]/,
                )
                const importsMotion =
                    imports !== null && /\bmotion\b/.test(imports[1])
                return importsMotion || /<motion\./.test(source)
            })
            .map(file => relative(SRC, file))
        expect(offenders).toEqual([])
        expect(read('app/layout.tsx')).toMatch(/<MotionProvider>/)
    })
})
