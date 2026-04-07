import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { UpupUploader } from '../src'
import { fr_FR } from '../src/shared/i18n/locales/fr_FR'

describe('Locale switching', () => {
    it('renders English strings by default', () => {
        const { container } = render(
            <UpupUploader provider="s3" serverUrl="https://example.com" />,
        )
        // AdapterSelector renders tr.browseFiles — en_US value is 'browse files'
        const text = container.textContent ?? ''
        expect(text.toLowerCase()).toContain('browse')
    })

    it('renders French strings when locale translations object is provided', () => {
        const { container } = render(
            <UpupUploader
                provider="s3"
                serverUrl="https://example.com"
                // i18n.locale as a Translations object activates the locale content.
                // A string locale code (e.g. 'fr-FR') only sets lang/dir attributes —
                // it does not auto-load a translation bundle.
                i18n={{ locale: fr_FR, overrides: {} }}
            />,
        )
        // fr_FR browseFiles = 'parcourir'
        const text = container.textContent ?? ''
        expect(text).toContain('parcourir')
    })

    it('root lang attribute reflects BCP-47 string locale', () => {
        const { container: c1 } = render(
            <UpupUploader provider="s3" serverUrl="https://example.com" />,
        )
        // Passing a string locale code sets the lang attribute even though
        // it does not auto-load the translation bundle.
        const { container: c2 } = render(
            <UpupUploader
                provider="s3"
                serverUrl="https://example.com"
                i18n={{ locale: 'fr-FR' }}
            />,
        )
        const root1 = c1.querySelector('[data-upup-slot="root"]')
        const root2 = c2.querySelector('[data-upup-slot="root"]')
        expect(root1?.getAttribute('lang')).toBe('en-US')
        expect(root2?.getAttribute('lang')).toBe('fr-FR')
    })

    it('RTL locale sets dir=rtl on root', () => {
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
})
