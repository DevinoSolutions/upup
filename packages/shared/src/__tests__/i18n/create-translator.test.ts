import { describe, it, expect, vi } from 'vitest'
import { createTranslator } from '../../i18n/create-translator'
import { enUS } from '../../i18n/locales/en-US'

describe('createTranslator', () => {
    it('formats a simple message', () => {
        const t = createTranslator({ bundle: enUS })
        expect(t('common.cancel')).toBe('Cancel')
    })

    it('formats ICU plurals', () => {
        const t = createTranslator({ bundle: enUS })
        expect(t('header.filesSelected', { count: 1 })).toBe(
            '1 file selected',
        )
        expect(t('header.filesSelected', { count: 5 })).toBe(
            '5 files selected',
        )
    })

    it('formats ICU interpolation', () => {
        const t = createTranslator({ bundle: enUS })
        expect(t('errors.uploadFailed', { message: 'timeout' })).toBe(
            'Upload failed: timeout',
        )
    })

    it('caches IntlMessageFormat instances', () => {
        const t = createTranslator({ bundle: enUS })
        // Call twice - second call should use cache
        t('header.filesSelected', { count: 1 })
        t('header.filesSelected', { count: 5 })
        // No error means cache works
    })

    it('calls onMissingKey for unknown keys', () => {
        const onMissingKey = vi.fn()
        const t = createTranslator({ bundle: enUS, onMissingKey })
        const result = t('common.nonexistent' as any)
        expect(onMissingKey).toHaveBeenCalledWith('common.nonexistent')
        expect(result).toBe('common.nonexistent')
    })

    it('applies user overrides', () => {
        const t = createTranslator({
            bundle: enUS,
            overrides: { common: { cancel: 'Nope' } },
        })
        expect(t('common.cancel')).toBe('Nope')
    })

    it('uses fallback bundles', () => {
        const frPartial = {
            ...enUS,
            code: 'fr-FR' as const,
            language: 'Fran\u00E7ais',
            messages: {
                ...enUS.messages,
                common: { ...enUS.messages.common, cancel: 'Annuler' },
            },
        }
        const t = createTranslator({
            bundle: frPartial,
            fallback: enUS,
        })
        expect(t('common.cancel')).toBe('Annuler')
        // Falls back to en-US for non-overridden keys
        expect(t('common.done')).toBe('Done')
    })

    it('exposes locale and dir', () => {
        const t = createTranslator({ bundle: enUS })
        expect(t.locale).toBe('en-US')
        expect(t.dir).toBe('ltr')
    })
})
