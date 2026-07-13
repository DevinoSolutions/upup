import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const cssPath = resolve(__dirname, '../dist/tailwind-prefixed.css')

describe('@useupup/vanilla CSS artifact', () => {
    it('builds a non-empty, .upup-scope-prefixed stylesheet', () => {
        expect(existsSync(cssPath)).toBe(true)
        const css = readFileSync(cssPath, 'utf8')
        expect(css.length).toBeGreaterThan(1000)
        expect(css).toContain('.upup-scope')
        // prefix + scope both applied:
        expect(css).toMatch(/\.upup-scope[^{]*\.upup-/)
        // Layer-defined classes must survive the content purge:
        expect(css).toContain('.upup-shadow-wrapper')
        expect(css).toContain('.upup-preview-scroll')
    })
})
