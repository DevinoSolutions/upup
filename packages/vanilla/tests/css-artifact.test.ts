import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const cssPath = resolve(__dirname, '../dist/tailwind-prefixed.css')

// The brace-balanced bodies of every `<prelude> { ... }` at-rule in `css`.
function atRuleBodies(css: string, prelude: string): string[] {
    const bodies: string[] = []
    let at = css.indexOf(prelude)
    while (at !== -1) {
        const open = css.indexOf('{', at)
        let depth = 0
        let end = open
        for (; end < css.length; end++) {
            if (css[end] === '{') depth++
            else if (css[end] === '}' && --depth === 0) break
        }
        bodies.push(css.slice(open + 1, end))
        at = css.indexOf(prelude, end)
    }
    return bodies
}

describe('@useupup/vanilla CSS artifact', () => {
    it('builds a non-empty, .upup-scope-prefixed stylesheet', () => {
        expect(existsSync(cssPath)).toBe(true)
        const css = readFileSync(cssPath, 'utf8')
        expect(css.length).toBeGreaterThan(1000)
        expect(css).toContain('.upup-scope')
        // prefix + scope both applied:
        expect(css).toMatch(/\.upup-scope[^{]*\.upup-/)
        // Layer-defined classes must survive the content purge:
        expect(css).toContain('.upup-panel-sheen')
        expect(css).toContain('.upup-preview-scroll')
        // The fx layer is emitted ONCE by the shared tailwind-config plugin —
        // these pins fail if the plugin is missing or a framework stops
        // inheriting it:
        expect(css).toContain('--upup-fx-fast')
        expect(css).toContain('--upup-fx-base')
        expect(css).toContain('--upup-fx-overlay')
        expect(css).toContain('--upup-fx-ease')
        expect(css).toContain('.upup-fx-hover-lift')
        expect(css).toContain('.upup-fx-press')
        expect(css).toContain('.upup-fx-sheen-sweep')
        expect(css).toContain('.upup-fx-icon-nudge')
        expect(css).toContain('.upup-fx-remove')
        // The essential progress-fill width tween (survives the kill switch via
        // its paired .fx-essential class) and the fx-family REC pulse keyframe:
        expect(css).toContain('.upup-fx-progress-fill')
        expect(css).toContain('fx-rec-pulse')
        // The add-more overlay open + reverse-close slides (component classes +
        // their keyframes) — timing token-driven, gated by the kill switch via
        // their upup-fx- substring:
        expect(css).toContain('.upup-fx-overlay-slide')
        expect(css).toContain('fx-overlay-slide')
        expect(css).toContain('.upup-fx-overlay-close-slide')
        expect(css).toContain('fx-overlay-close-slide')
        // The collapsible drive-search expand entrance (component class + its
        // keyframe) — token-driven, gated by the kill switch via its
        // upup-fx- substring:
        expect(css).toContain('.upup-fx-search-expand')
        expect(css).toContain('fx-search-expand')
        expect(css).toContain('fx-enter')
        expect(css).toContain('fx-view')
        expect(css).toContain('fx-draw')
        expect(css).toContain('fx-dash-march')
        // The kill switch and its essential carve-out:
        expect(css).toContain("[data-motion='off']")
        expect(css).toContain('upup-fx-essential')
        expect(css).toContain('prefers-reduced-motion')
        // The gate must also cover the keyframe animation utilities, which are
        // named upup-animate-fx-* (NO upup-fx- substring), so a lone
        // [class*='upup-fx-'] matcher would let every fx-* animation escape.
        // Pin the paired :is() selector exactly as the artifact emits it:
        expect(css).toContain(
            "[data-motion='off'] :is([class*='upup-fx-'], [class*='upup-animate-fx-'])",
        )
        // Motion audit (T-5010): the same gate, in both reduced forms, drops
        // the non-fx motion components carry (`upup-transition-*` utilities,
        // the `animate-pulse` pulses) and the progress-fill width tween, while
        // spinners (`upup-animate-spin`) match none of it and keep spinning:
        expect(css).toContain(
            "[data-motion='off'] [class*='upup-transition']:not(.upup-fx-essential)",
        )
        expect(css).toContain(
            "[data-motion='off'] [class*='animate-pulse']:not(.upup-fx-essential)",
        )
        expect(css).toContain("[data-motion='off'] .upup-fx-progress-fill")
        const reduced = atRuleBodies(
            css,
            '@media (prefers-reduced-motion: reduce)',
        ).join(' ')
        expect(reduced).toContain("[class*='upup-transition']")
        expect(reduced).toContain("[class*='animate-pulse']")
        expect(css).toMatch(
            /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.upup-scope \.upup-fx-progress-fill\s*\{\s*transition: none !important;/,
        )
        // Motion audit budgets: overlay 250ms, draw 300ms, hover sweep on the
        // fast token, no box-shadow tween, no rotate, no pop overshoot, an
        // opacity-only rec pulse, and every hover rule behind (hover: hover):
        expect(css).toContain('--upup-fx-overlay: 250ms')
        expect(css).toContain('upup-fx-draw 300ms')
        expect(css).not.toContain('box-shadow var(')
        expect(css).not.toContain('rotate(90deg)')
        expect(css).not.toContain('600ms')
        expect(css).toMatch(
            /@keyframes upup-fx-pop\s*\{\s*0%\s*\{\s*opacity: 0;\s*transform: scale\(0\.96\);/,
        )
        expect(css).not.toContain('scale(1.12)')
        const pop = atRuleBodies(css, '@keyframes upup-fx-pop')
        expect(pop).toHaveLength(1)
        const [popBody = ''] = pop
        expect(popBody).toMatch(
            /100%\s*\{\s*opacity: 1;\s*transform: scale\(1\);\s*\}\s*$/,
        )
        // No overshoot anywhere in the pop: every scale stays at or below 1.
        const popScales = [...popBody.matchAll(/scale\(([\d.]+)\)/g)].map(m =>
            Number(m[1]),
        )
        expect(popScales.length).toBeGreaterThan(0)
        expect(Math.max(...popScales)).toBeLessThanOrEqual(1)
        // Hover lift tweens exactly transform + background-color (hover bg
        // fades stay), never box-shadow:
        const liftDecl = css.match(
            /\.upup-scope \.upup-fx-hover-lift\s*\{([^}]*)\}/,
        )
        expect(liftDecl?.[1]?.trim()).toBe(
            'transition: transform var(--upup-fx-fast) var(--upup-fx-ease), background-color var(--upup-fx-fast) var(--upup-fx-ease);',
        )
        // The sheen-sweep hover travel runs on the fast token:
        const sweepDecl = css.match(
            /\.upup-scope \.upup-fx-sheen-sweep::after\s*\{([^}]*)\}/,
        )
        expect(sweepDecl?.[1]).toContain(
            'transition: transform var(--upup-fx-fast) var(--upup-fx-ease);',
        )
        expect(css).toMatch(
            /@keyframes upup-fx-rec-pulse\s*\{\s*0%, 100%\s*\{\s*opacity: 1;\s*\}\s*50%\s*\{\s*opacity: 0\.55;\s*\}\s*\}/,
        )
        const hover = atRuleBodies(css, '@media (hover: hover)').join(' ')
        for (const rule of [
            '.upup-fx-hover-lift:hover',
            '.upup-fx-icon-nudge:hover svg',
            '.upup-fx-sheen-sweep:hover::after',
            '.upup-fx-remove:hover',
        ]) {
            // Each hover rule exists exactly once, and only inside the media
            // block (tailwind re-emits a shared block per candidate otherwise):
            expect(css.split(rule).length - 1).toBe(1)
            expect(hover).toContain(rule)
        }
        // Guard the double-prefix regression: tailwind's prefix:'upup-' also
        // prefixes addComponents keys, so a hardcoded '.upup-fx-*' key doubles
        // to '.upup-upup-fx-*'. Plugin keys must stay unprefixed.
        expect(css).not.toContain('upup-upup')
        // The old flat-shadow chrome was replaced by the gradient + sheen:
        expect(css).not.toContain('.upup-shadow-wrapper')
    })
})
