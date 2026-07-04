import { describe, it, expect } from 'vitest'
import { readdirSync } from 'node:fs'
import { LOCALE_CODES, LOCALE_REGISTRY } from '../../i18n/locales/registry'
import { LOCALE_META } from '../../i18n/locale-meta'

describe('locale registry is the single source of truth', () => {
    it('LOCALE_CODES matches LOCALE_REGISTRY keys', () =>
        expect([...LOCALE_CODES].sort()).toEqual(
            Object.keys(LOCALE_REGISTRY).sort(),
        ))

    it('LOCALE_META covers exactly the registry', () =>
        expect(Object.keys(LOCALE_META).sort()).toEqual(
            [...LOCALE_CODES].sort(),
        ))

    it('every bundle file in locales/ is registered', () => {
        const files = readdirSync(
            new URL('../../i18n/locales/', import.meta.url),
        )
            .filter(
                f =>
                    f.endsWith('.ts') &&
                    !['registry.ts', 'index.ts', 'locale-codes.ts'].includes(f),
            )
            .map(f => f.replace(/\.ts$/, ''))
        expect(files.sort()).toEqual([...LOCALE_CODES].sort())
    })

    it('each registered bundle self-reports its own code', () =>
        LOCALE_CODES.forEach(c => expect(LOCALE_REGISTRY[c].code).toBe(c)))
})
