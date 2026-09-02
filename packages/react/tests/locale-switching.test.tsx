import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { UpupUploader } from '../src'
import { frFR } from '@useupup/core'
import type { LocaleBundle } from '@useupup/core'

describe('Locale switching', () => {
    it('renders English strings by default', () => {
        const { container } = render(
            <UpupUploader provider="aws" serverUrl="https://example.com" />,
        )
        // SourceSelector renders tr.browseFiles — en_US value is 'browse files'
        const text = container.textContent ?? ''
        expect(text.toLowerCase()).toContain('browse')
    })

    it('renders French strings when locale translations object is provided', () => {
        const { container } = render(
            <UpupUploader
                provider="aws"
                serverUrl="https://example.com"
                // i18n.locale as a LocaleBundle activates the locale content.
                // A string locale code (e.g. 'fr-FR') only sets lang/dir attributes —
                // it does not auto-load a translation bundle.
                i18n={{ locale: frFR, overrides: {} }}
            />,
        )
        // fr_FR browseFiles = 'parcourir'
        const text = container.textContent ?? ''
        expect(text).toContain('parcourir')
    })

    it('root lang attribute reflects BCP-47 string locale', () => {
        const { container: c1 } = render(
            <UpupUploader provider="aws" serverUrl="https://example.com" />,
        )
        // Passing a string locale code sets the lang attribute even though
        // it does not auto-load the translation bundle.
        const { container: c2 } = render(
            <UpupUploader
                provider="aws"
                serverUrl="https://example.com"
                i18n={{ locale: 'fr-FR' }}
            />,
        )
        const root1 = c1.querySelector('[data-upup-slot="root"]')
        const root2 = c2.querySelector('[data-upup-slot="root"]')
        expect(root1?.getAttribute('lang')).toBe('en-US')
        expect(root2?.getAttribute('lang')).toBe('fr-FR')
    })

    it('uses fallbackLocale bundle when the active bundle is missing a key', () => {
        const sparseLocale = {
            code: 'zz-ZZ',
            language: 'Sparse',
            dir: 'ltr',
            messages: {},
        } as unknown as LocaleBundle

        const { container } = render(
            <UpupUploader
                provider="aws"
                serverUrl="https://example.com"
                i18n={{ locale: sparseLocale, fallbackLocale: frFR }}
            />,
        )

        expect(container.textContent ?? '').toContain('parcourir')
    })

    it('RTL locale sets dir=rtl on root', () => {
        const { container } = render(
            <UpupUploader
                provider="aws"
                serverUrl="https://example.com"
                i18n={{ locale: 'ar-SA' }}
            />,
        )
        const root = container.querySelector('[data-upup-slot="root"]')
        expect(root?.getAttribute('lang')).toBe('ar-SA')
        expect(root?.getAttribute('dir')).toBe('rtl')
    })
})
