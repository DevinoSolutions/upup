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
        expect(css).toContain('fx-enter')
        expect(css).toContain('fx-view')
        expect(css).toContain('fx-draw')
        expect(css).toContain('fx-dash-march')
        // The kill switch and its essential carve-out:
        expect(css).toContain("[data-motion='off']")
        expect(css).toContain('upup-fx-essential')
        expect(css).toContain('prefers-reduced-motion')
        // Guard the double-prefix regression: tailwind's prefix:'upup-' also
        // prefixes addComponents keys, so a hardcoded '.upup-fx-*' key doubles
        // to '.upup-upup-fx-*'. Plugin keys must stay unprefixed.
        expect(css).not.toContain('upup-upup')
        // The old flat-shadow chrome was replaced by the gradient + sheen:
        expect(css).not.toContain('.upup-shadow-wrapper')
    })
})
