import { describe, it, expect } from 'vitest'
import { buildFallbackChain, resolveMessage } from '../../i18n/resolve-locale'
import { enUS } from '../../i18n/locales/en-US'
import type { LocaleBundle } from '../../i18n/types'

describe('buildFallbackChain', () => {
    it('builds chain from specific to general', () => {
        const chain = buildFallbackChain('fr-CA')
        expect(chain).toEqual(['fr-CA', 'fr', 'en-US'])
    })

    it('handles base locale', () => {
        const chain = buildFallbackChain('fr')
        expect(chain).toEqual(['fr', 'en-US'])
    })

    it('does not duplicate en-US', () => {
        const chain = buildFallbackChain('en-US')
        expect(chain).toEqual(['en-US'])
    })
})

describe('resolveMessage', () => {
    const bundles = new Map<string, LocaleBundle>()
    bundles.set('en-US', enUS)

    const frPartial: LocaleBundle = {
        code: 'fr-FR',
        language: 'Fran\u00E7ais',
        dir: 'ltr',
        messages: {
            ...enUS.messages,
            common: { ...enUS.messages.common, cancel: 'Annuler' },
        },
    }
    bundles.set('fr-FR', frPartial)

    it('resolves from primary bundle', () => {
        const msg = resolveMessage(
            bundles,
            ['fr-FR', 'fr', 'en-US'],
            'common',
            'cancel',
        )
        expect(msg).toBe('Annuler')
    })

    it('falls back for missing keys', () => {
        const msg = resolveMessage(
            bundles,
            ['fr-FR', 'fr', 'en-US'],
            'common',
            'done',
        )
        expect(msg).toBe('Done')
    })
})
