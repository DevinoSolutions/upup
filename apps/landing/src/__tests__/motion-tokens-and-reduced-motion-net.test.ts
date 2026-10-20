import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Structural pins for the landing motion tokens PR (docs/motion-audit.md,
// section 5): the --motion-* tokens, Tailwind's wiring of them, the global
// reduced-motion net (which must leave the embedded uploader alone) and the
// JS-side MotionConfig. Source-text assertions on purpose: jsdom has no
// stylesheet cascade or matchMedia worth trusting for any of this.
const read = (rel: string) =>
    readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')

const css = read('../app/globals.css')
const tailwindConfig = read('../../tailwind.config.ts')
const provider = read('../components/motion-provider.tsx')

describe('landing motion tokens', () => {
    it('declares every --motion-* token on :root with the brief values', () => {
        const root = css.match(/:root\s*\{[^}]*\}/)?.[0] ?? ''
        expect(root).toMatch(/--motion-dur-fast:\s*120ms/)
        expect(root).toMatch(/--motion-dur-base:\s*180ms/)
        expect(root).toMatch(/--motion-dur-slow:\s*240ms/)
        expect(root).toMatch(
            /--motion-ease-out:\s*cubic-bezier\(0?\.16,\s*1,\s*0?\.3,\s*1\)/,
        )
        expect(root).toMatch(
            /--motion-ease-in:\s*cubic-bezier\(0?\.4,\s*0,\s*1,\s*1\)/,
        )
    })

    it('exposes the tokens and the four motion keyframes through tailwind', () => {
        for (const name of ['fast', 'base', 'slow'])
            expect(tailwindConfig).toContain(
                `${name}: 'var(--motion-dur-${name})'`,
            )
        expect(tailwindConfig).toContain("'var(--motion-ease-out)'")
        expect(tailwindConfig).toContain("'var(--motion-ease-in)'")
        for (const name of [
            'motion-enter',
            'motion-enter-down',
            'motion-fade',
            'motion-panel',
        ])
            expect(tailwindConfig).toContain(`'${name}': {`)
    })

    it('keeps the retired 0.5 s / 20 px / infinite animations out of the config', () => {
        expect(tailwindConfig).not.toMatch(/fadeIn|fadeInUp|bounce-slow/)
        expect(css).not.toContain('animate-scale-in')
    })
})

describe('global reduced-motion net', () => {
    // The net is the last top-level @media (prefers-reduced-motion) block in
    // the stylesheet, i.e. outside every @layer.
    const net = css.slice(css.lastIndexOf('@media (prefers-reduced-motion'))

    it('forces animation and transition timing under prefers-reduced-motion', () => {
        expect(net).toMatch(/animation-duration:\s*0?\.01ms\s*!important/)
        expect(net).toMatch(/animation-iteration-count:\s*1\s*!important/)
        expect(net).toMatch(/transition-duration:\s*0?\.01ms\s*!important/)
    })

    it('covers pseudo-elements without placing them inside :where()/:is()', () => {
        expect(net).toContain('::before')
        expect(net).toContain('::after')
        expect(net).not.toMatch(/:(where|is)\([^)]*::/)
    })

    it('excludes the embedded uploader subtree and spinners', () => {
        expect(net).toContain('.upup-scope')
        expect(net).toContain('.upup-scope *')
        expect(net).toContain('animate-spin')
    })

    it('sits outside every @layer so its !important is the only override', () => {
        const before = css.slice(
            0,
            css.lastIndexOf('@media (prefers-reduced-motion'),
        )
        const opens = (before.match(/@layer\s+\w+\s*\{/g) ?? []).length
        // Every @layer block opened earlier must have closed by the net.
        let depth = 0
        for (const ch of before) {
            if (ch === '{') depth++
            else if (ch === '}') depth--
        }
        expect(opens).toBeGreaterThan(0)
        expect(depth).toBe(0)
    })

    it('leaves the existing hero and marquee reduced-motion rules in place', () => {
        expect(css).toMatch(
            /\.hero-rise,\s*\.hero-lift,\s*\.hero-word\s*\{\s*animation:\s*none/,
        )
    })
})

describe('MotionProvider', () => {
    it('wraps children in MotionConfig reducedMotion="user" inside LazyMotion', () => {
        expect(provider).toMatch(
            /import\s*\{[^}]*\bMotionConfig\b[^}]*\}\s*from\s*'framer-motion'/,
        )
        const lazy = provider.indexOf('<LazyMotion')
        const config = provider.indexOf('<MotionConfig reducedMotion="user">')
        expect(lazy).toBeGreaterThan(-1)
        expect(config).toBeGreaterThan(lazy)
        expect(provider.indexOf('</MotionConfig>')).toBeLessThan(
            provider.indexOf('</LazyMotion>'),
        )
    })

    it('never imports the full-bundle `motion` component (first-load guard)', () => {
        const imports = provider.match(
            /import\s*\{([^}]*)\}\s*from\s*'framer-motion'/,
        )
        expect(imports?.[1]).not.toMatch(/\bmotion\b/)
    })
})
