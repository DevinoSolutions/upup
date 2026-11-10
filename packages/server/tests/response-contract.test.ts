// Structural pin for the F-108 response contract: respond.ts is the single
// home for composing an HTTP Response, so every route always carries the
// request's CORS headers + x-upup-request-id. A `new Response(` anywhere else
// in src/ is a defect (health.ts was the last exception, removed in F-715).
// This replaces the manual "§8 structural grep" audit step with a gate.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('../src', import.meta.url))

function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) return walk(full)
        return entry.name.endsWith('.ts') ? [full] : []
    })
}

describe('response contract (F-108 / F-715)', () => {
    it('`new Response(` appears in src/ only inside respond.ts', () => {
        const offenders = walk(SRC)
            .filter(file =>
                readFileSync(file, 'utf8').includes('new Response('),
            )
            .map(file => relative(SRC, file).replace(/\\/g, '/'))
            .filter(file => file !== 'respond.ts')
        expect(offenders).toEqual([])
    })

    // T-6087: provider failures are mapped per cause. A rejection the client
    // must fix is DEPENDENCY_REJECTED_STATUS (424); a transient or upstream
    // failure is UPSTREAM_UNAVAILABLE_STATUS (502). Every 502/504 in src/ goes
    // through that one named constant, so a new bare 502 is a deliberate choice.
    it('the only 502/504 literal in src/ is the UPSTREAM_UNAVAILABLE_STATUS declaration', () => {
        const stripComments = (text: string) =>
            text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
        const hits = walk(SRC).flatMap(file =>
            stripComments(readFileSync(file, 'utf8'))
                .split(/\r?\n/)
                .filter(line => /\b50[24]\b/.test(line))
                .map(
                    line =>
                        `${relative(SRC, file).replace(/\\/g, '/')}: ${line.trim()}`,
                ),
        )
        expect(hits).toEqual([
            'respond.ts: export const UPSTREAM_UNAVAILABLE_STATUS = 502',
        ])
    })
})
