import { describe, it, expect, vi } from 'vitest'
import { createTranslator } from '../../i18n/create-translator'
import { enUS } from '../../i18n/locales/en-US'

describe('createTranslator — extended', () => {
    it('handles zero count in plurals', () => {
        const t = createTranslator({ bundle: enUS })
        const result = t('header.filesSelected', { count: 0 })
        expect(result).toContain('0')
    })

    it('returns key string for missing key without onMissingKey', () => {
        const t = createTranslator({ bundle: enUS })
        const result = t('totally.fake.key' as any)
        expect(result).toBe('totally.fake.key')
    })

    it('formats with missing interpolation vars gracefully', () => {
        const t = createTranslator({ bundle: enUS })
        // Call with key that expects vars but provide none
        const result = t('errors.uploadFailed')
        // Should not throw, may show placeholder or empty
        expect(typeof result).toBe('string')
    })

    it('overrides only affect specified keys', () => {
        const t = createTranslator({
            bundle: enUS,
            overrides: { common: { cancel: 'Abort' } },
        })
        expect(t('common.cancel')).toBe('Abort')
        expect(t('common.done')).toBe('Done') // unaffected
    })

    it('multiple translator instances are independent', () => {
        const t1 = createTranslator({ bundle: enUS })
        const t2 = createTranslator({
            bundle: enUS,
            overrides: { common: { cancel: 'X' } },
        })
        expect(t1('common.cancel')).toBe('Cancel')
        expect(t2('common.cancel')).toBe('X')
    })

    it('locale property matches bundle code', () => {
        const t = createTranslator({ bundle: enUS })
        expect(t.locale).toBe(enUS.code)
    })

    it('dir is ltr for en-US', () => {
        const t = createTranslator({ bundle: enUS })
        expect(t.dir).toBe('ltr')
    })

    it('onMissingKey is not called for existing keys', () => {
        const onMissingKey = vi.fn()
        const t = createTranslator({ bundle: enUS, onMissingKey })
        t('common.cancel')
        expect(onMissingKey).not.toHaveBeenCalled()
    })

    it('large count values work in plurals', () => {
        const t = createTranslator({ bundle: enUS })
        const result = t('header.filesSelected', { count: 999999 })
        // ICU formats large numbers with locale separators (e.g. 999,999)
        expect(result).toContain('files selected')
    })

    it('fallback is used when primary bundle lacks key', () => {
        const sparse = {
            ...enUS,
            code: 'xx-XX' as const,
            messages: { common: { cancel: 'XX Cancel' } } as any,
        }
        const t = createTranslator({ bundle: sparse, fallback: enUS })
        expect(t('common.cancel')).toBe('XX Cancel')
        expect(t('common.done')).toBe('Done') // from fallback
    })
})
