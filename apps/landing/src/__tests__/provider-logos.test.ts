import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
    IbmLogo,
    IDriveLogo,
    LinodeLogo,
} from '@/components/HomepageFeatures/ProviderLogos'

// The integration wall used generic FontAwesome glyphs (a server rack, a
// database cylinder, a cube) for the three storage providers simple-icons
// does not ship. They now draw each vendor's own published mark
// (2026-10-10). The first commands of each path tell the official mark from
// a stand-in glyph.

const MARKS = [
    {
        id: 'linode',
        component: LinodeLogo,
        viewBox: '0 0 41.52 45',
        pathPrefix: 'M22.8923 44.0093C23.9483 44.3314',
    },
    {
        id: 'idrive',
        component: IDriveLogo,
        viewBox: '49 0.6 16.4 21.7',
        pathPrefix: 'M64.4,3.9c-0.9-1.5-2.2-2.5-3.9-3',
    },
    {
        id: 'ibm',
        component: IbmLogo,
        viewBox: '0 0 50 21',
        pathPrefix: 'M0 18.808L9.7222 18.808',
    },
] as const

describe('storage provider logos', () => {
    it('each provider draws its official mark, inline in currentColor', () => {
        for (const mark of MARKS) {
            const html = renderToStaticMarkup(
                createElement(mark.component, { className: 'h-5 w-5' }),
            )
            expect(html, mark.id).toContain(`viewBox="${mark.viewBox}"`)
            expect(html, mark.id).toContain('fill="currentColor"')
            expect(html, mark.id).toContain('aria-hidden="true"')
            expect(html, mark.id).toContain(`data-provider-logo="${mark.id}"`)
            expect(html, mark.id).toContain(` d="${mark.pathPrefix}`)
            // Mono: no vendor colour survives into the markup.
            expect(html, mark.id).not.toMatch(/#[0-9a-f]{6}/i)
        }
    })

    it('the IBM wordmark keeps its aspect ratio instead of the square box', () => {
        const html = renderToStaticMarkup(
            createElement(IbmLogo, { className: 'w-3.5 h-3.5' }),
        )
        expect(html).toContain('style="width:auto"')
    })

    it('the wall no longer uses the generic placeholder glyphs', () => {
        const src = readFileSync(
            fileURLToPath(
                new URL(
                    '../components/HomepageFeatures/index.tsx',
                    import.meta.url,
                ),
            ),
            'utf8',
        )
        for (const placeholder of ['FaServer', 'FaDatabase', 'FaCube']) {
            expect(src, placeholder).not.toContain(placeholder)
        }
        expect(src).toContain('icon: LinodeLogo')
        expect(src).toContain('icon: IDriveLogo')
        expect(src).toContain('icon: IbmLogo')
    })
})
