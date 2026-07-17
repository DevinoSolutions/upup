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
        // The old flat-shadow chrome was replaced by the gradient + sheen:
        expect(css).not.toContain('.upup-shadow-wrapper')
    })
})
