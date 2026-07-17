import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const cssPath = resolve(__dirname, '../dist/tailwind-prefixed.css')

describe('@upupjs/vanilla CSS artifact', () => {
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
        // The idle-hint keyframes come from the shared postcss factory —
        // a regression there would silently kill the animation everywhere:
        expect(css).toContain('hint-pulse')
        expect(css).toContain('hint-bob')
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
        // Guard the double-prefix regression: tailwind's prefix:'upup-' also
        // prefixes addComponents keys, so a hardcoded '.upup-fx-*' key doubles
        // to '.upup-upup-fx-*'. Plugin keys must stay unprefixed.
        expect(css).not.toContain('upup-upup')
        // The old flat-shadow chrome was replaced by the gradient + sheen:
        expect(css).not.toContain('.upup-shadow-wrapper')
    })
})
