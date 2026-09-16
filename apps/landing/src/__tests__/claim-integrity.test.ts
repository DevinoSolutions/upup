import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Ratchet for the 2026-09 claim-integrity pass. Marketing copy is read
// literally by the people evaluating upup, so the wording the audit retired
// must not creep back in. Two classes are gated here:
//
//  1. Claims the code cannot back. The cross-framework parity suite compares a
//     NORMALIZED tree — structure, `upup-` class tokens, a11y attributes and
//     text, with framework-injected attributes stripped and Angular host
//     elements unwrapped (apps/e2e-test/cross-framework/parity-dom.ts) — so
//     "byte-identical" / "byte-for-byte" overstates what it proves. The site
//     also has no account system (src/app has no sign-up route), so copy about
//     data collected "when you sign up" describes a flow that does not exist.
//  2. Social proof upup has never been able to substantiate: user counts,
//     "trusted by" endorsements, and ranking superlatives. None appear today —
//     this locks that in rather than fixing it after it ships.
//
// The sources are read as TEXT on purpose: the claims live in string literals
// and JSX prose, and a text read catches them wherever in the file they move.

const COPY_SOURCES: Record<string, string> = {
    'src/lib/faqs.ts': '../lib/faqs.ts',
    'src/components/FeatureShowcase/index.tsx':
        '../components/FeatureShowcase/index.tsx',
    'src/components/HomepageFeatures/index.tsx':
        '../components/HomepageFeatures/index.tsx',
    'src/app/privacy/page.tsx': '../app/privacy/page.tsx',
}

function readCopySources(): [string, string][] {
    return Object.entries(COPY_SOURCES).map(([label, relative]) => [
        label,
        readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8'),
    ])
}

/** JSX prose is hard-wrapped, so a phrase can straddle a newline + indent. */
function normalizeWhitespace(source: string): string {
    return source.replace(/\s+/g, ' ')
}

describe('landing copy claim integrity', () => {
    it('reads every landing copy source this guard is supposed to cover', () => {
        for (const [label, text] of readCopySources()) {
            expect(
                text.length,
                `${label} is empty or unreadable`,
            ).toBeGreaterThan(500)
        }
    })

    it('states no byte-identical or byte-for-byte DOM claim, because the parity suite compares a normalized tree', () => {
        for (const [label, text] of readCopySources()) {
            const prose = normalizeWhitespace(text).toLowerCase()
            expect(
                prose,
                `${label} claims byte-identical rendering the parity suite does not verify`,
            ).not.toContain('byte-identical')
            expect(
                prose,
                `${label} claims byte-for-byte rendering the parity suite does not verify`,
            ).not.toContain('byte-for-byte')
        }
    })

    it('describes no data collected at sign-up, because the site ships no sign-up route', () => {
        for (const [label, text] of readCopySources()) {
            const prose = normalizeWhitespace(text).toLowerCase()
            expect(
                prose,
                `${label} references a sign-up flow that does not exist on useupup.com`,
            ).not.toContain('when you sign up')
        }
    })

    it('carries no unsubstantiated social proof such as trusted-by endorsements, user counts or ranking superlatives', () => {
        const UNSUBSTANTIATED = [
            'trusted by',
            'users worldwide',
            '#1',
            'most popular',
        ]
        for (const [label, text] of readCopySources()) {
            const prose = normalizeWhitespace(text).toLowerCase()
            for (const phrase of UNSUBSTANTIATED) {
                expect(
                    prose,
                    `${label} makes an unsubstantiated "${phrase}" claim — upup has no published adoption figures to back it`,
                ).not.toContain(phrase)
            }
        }
    })
})
