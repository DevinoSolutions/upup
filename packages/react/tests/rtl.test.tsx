import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { UpupUploader } from '../src'
import { en_US } from '../src/shared/i18n'

describe('RTL support', () => {
    it('root has lang="en-US" and dir="ltr" by default', () => {
        const { container } = render(
            <UpupUploader provider="s3" serverUrl="https://example.com" />,
        )
        const root = container.querySelector('[data-upup-slot="root"]')
        expect(root?.getAttribute('lang')).toBe('en-US')
        expect(root?.getAttribute('dir')).toBe('ltr')
    })

    it('root has lang="ar-SA" and dir="rtl" when locale is Arabic', () => {
        const { container } = render(
            <UpupUploader
                provider="s3"
                serverUrl="https://example.com"
                i18n={{ locale: 'ar-SA' }}
            />,
        )
        const root = container.querySelector('[data-upup-slot="root"]')
        expect(root?.getAttribute('lang')).toBe('ar-SA')
        expect(root?.getAttribute('dir')).toBe('rtl')
    })

    it('root has dir="ltr" for French locale', () => {
        const { container } = render(
            <UpupUploader
                provider="s3"
                serverUrl="https://example.com"
                i18n={{ locale: 'fr-FR' }}
            />,
        )
        const root = container.querySelector('[data-upup-slot="root"]')
        expect(root?.getAttribute('lang')).toBe('fr-FR')
        expect(root?.getAttribute('dir')).toBe('ltr')
    })

    it('root has lang="en-US" and dir="ltr" when i18n.locale is a Translations object', () => {
        const { container } = render(
            <UpupUploader
                provider="s3"
                serverUrl="https://example.com"
                i18n={{ locale: en_US }}
            />,
        )
        const root = container.querySelector('[data-upup-slot="root"]')
        expect(root?.getAttribute('lang')).toBe('en-US')
        expect(root?.getAttribute('dir')).toBe('ltr')
    })
})
