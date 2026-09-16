import { describe, it, expect } from 'vitest'
import { driveErrorText } from '../src/drives/drive-error-text'
import { createTranslator } from '../src/i18n/create-translator'
import { flattenTranslatorToUiTranslations } from '../src/i18n/ui-translations'
import type { UiTranslations } from '../src/i18n/ui-translations'
import type { LocaleBundle } from '../src/i18n/types'
import { enUS } from '../src/i18n/locales/en-US'

const flat = (bundle: LocaleBundle, fallback?: LocaleBundle): UiTranslations =>
    flattenTranslatorToUiTranslations(
        createTranslator(fallback ? { bundle, fallback } : { bundle }),
    )

/**
 * A consumer bundle with `errors.authCancelled` missing — the documented
 * hand-written-bundle path, and the reason the key is optional on
 * `ErrorMessages` rather than required.
 */
const withoutAuthCancelled = (): LocaleBundle => {
    const errors = { ...enUS.messages.errors }
    delete errors.authCancelled
    return {
        ...enUS,
        code: 'en-XX',
        messages: { ...enUS.messages, errors },
    }
}

describe('driveErrorText — which sentence the drive views show (#390)', () => {
    const tr = flat(enUS)

    it('prefers the string named by messageKey over the plugin diagnostic, because the diagnostic described the call and not the person', () => {
        expect(
            driveErrorText(
                {
                    message: 'Popup was blocked by the browser',
                    messageKey: 'authCancelled',
                },
                tr,
            ),
        ).toBe('Sign-in was cancelled')
    })

    it('still says popup blocked for a real block, through the catalogue rather than an English literal', () => {
        expect(
            driveErrorText(
                { message: 'Popup was blocked', messageKey: 'popupBlocked' },
                tr,
            ),
        ).toBe('Popup blocked')
    })

    it('keeps the plugin message verbatim when the controller recognised nothing, so the detail a generic string would discard survives', () => {
        expect(
            driveErrorText(
                { message: 'Token exchange failed: 400 invalid_grant' },
                tr,
            ),
        ).toBe('Token exchange failed: 400 invalid_grant')
    })

    it('translates, not transliterates: a non-English bundle answers in its own language', () => {
        const frFR = flat(
            {
                ...enUS,
                code: 'fr-FR',
                messages: {
                    ...enUS.messages,
                    errors: {
                        ...enUS.messages.errors,
                        authCancelled: 'Connexion annulée',
                    },
                },
            },
            enUS,
        )
        expect(
            driveErrorText(
                {
                    message: 'cancelled (access_denied)',
                    messageKey: 'authCancelled',
                },
                frFR,
            ),
        ).toBe('Connexion annulée')
    })
})

describe('driveErrorText — a bundle that never heard of authCancelled', () => {
    it('resolves through the fallback bundle the uploader always wires, so the consumer sees English rather than a key', () => {
        const tr = flat(withoutAuthCancelled(), enUS)
        expect(
            driveErrorText(
                {
                    message: 'cancelled (access_denied)',
                    messageKey: 'authCancelled',
                },
                tr,
            ),
        ).toBe('Sign-in was cancelled')
    })

    it('falls back to English even with NO fallback bundle, because createTranslator echoes the key on a total miss and "errors.authCancelled" must never reach a screen', () => {
        const tr = flat(withoutAuthCancelled())
        // The echo this guards against, asserted so the test fails loudly if
        // createTranslator ever changes what a miss returns.
        expect(tr.authCancelled).toBe('errors.authCancelled')
        expect(
            driveErrorText(
                {
                    message: 'cancelled (access_denied)',
                    messageKey: 'authCancelled',
                },
                tr,
            ),
        ).toBe('Sign-in was cancelled')
    })
})

describe('driveErrorText — the English fallback is a copy, so it is pinned to the catalogue', () => {
    // The two sentences are written out in `drive-error-text.ts` instead of
    // imported, to keep the whole en-US bundle out of every drive render path.
    // These two cases are what stops the copy drifting from the real bundle.
    const missing = (): LocaleBundle => ({
        ...enUS,
        code: 'en-XX',
        messages: { ...enUS.messages, errors: {} as never },
    })

    it.each([
        ['authCancelled', enUS.messages.errors.authCancelled],
        ['popupBlocked', enUS.messages.errors.popupBlocked],
    ] as const)(
        'the hard-coded %s sentence still matches the en-US bundle',
        (messageKey, expected) => {
            expect(
                driveErrorText(
                    { message: 'ignored', messageKey },
                    flat(missing()),
                ),
            ).toBe(expected)
        },
    )
})
