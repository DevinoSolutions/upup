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

    // T-6087: Cloudflare rewrites every ORIGIN 502/504 into its own text/plain
    // "error code: 502" page (no JSON body, no UpupErrorCode, no
    // x-upup-request-id), so a provider misconfiguration read as a Cloudflare
    // outage. Upstream-provider failures use UPSTREAM_FAILURE_STATUS (424).
    it('no 502/504 status is emitted or logged from src/ (Cloudflare masks them)', () => {
        const stripComments = (text: string) =>
            text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
        const offenders = walk(SRC)
            .filter(file =>
                /\b50[24]\b/.test(stripComments(readFileSync(file, 'utf8'))),
            )
            .map(file => relative(SRC, file).replace(/\\/g, '/'))
        expect(offenders).toEqual([])
    })
})
