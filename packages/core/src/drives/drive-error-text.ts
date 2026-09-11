import type { UiTranslations } from '../i18n/ui-translations'
import type { DriveBrowserError, DriveErrorMessageKey } from './types'

/**
 * The flat `errors.*` path each `messageKey` was read from.
 *
 * `createTranslator` returns THE KEY ITSELF when a message is missing from the
 * bundle, its fallback bundle and the overrides (`create-translator.ts`), so an
 * echo of one of these is a miss and not a translation — rendering it would put
 * the literal "errors.authCancelled" in front of the user.
 */
const FLAT_KEY: Record<DriveErrorMessageKey, string> = {
    popupBlocked: 'errors.popupBlocked',
    authCancelled: 'errors.authCancelled',
}

/**
 * The last-resort English wording, copied from the en-US bundle rather than
 * imported from it: this module is reached from every drive render path, and
 * pulling the whole bundle in for two strings would put it in front of the
 * size budget. `drive-error-text.test.ts` pins both against the real bundle,
 * so the copy cannot drift.
 */
const ENGLISH: Record<DriveErrorMessageKey, string> = {
    popupBlocked: 'Popup blocked',
    authCancelled: 'Sign-in was cancelled',
}

/**
 * The sentence to show for a drive failure (#390).
 *
 * `error.message` is the plugin's own English diagnostic. It is truthful about
 * the call it describes and sometimes wrong about the person: a declined OAuth
 * consent screen used to arrive here reading "Popup was blocked by the browser",
 * which sent the user into their browser settings over a choice they had made
 * themselves — and it was never localised, in any of the nine locales.
 *
 * So when the controller recognised the outcome it sets `messageKey`, and that
 * translated string wins. Everything else keeps its message, which carries
 * detail a generic translated string would throw away.
 *
 * `authCancelled` is OPTIONAL on `ErrorMessages`, so a consumer's hand-written
 * bundle may not carry it. The uploader always wires en-US as the fallback
 * bundle (`normalize-options.ts`) and would resolve it anyway, but
 * `createTranslator` accepts no fallback at all — so the miss is handled here
 * too, and the key echo never reaches a screen.
 *
 * Lives in core, not in one framework's `lib/`, because all five renderers show
 * this string: React, Vue, Svelte, Angular and vanilla.
 */
export function driveErrorText(
    error: DriveBrowserError,
    tr: UiTranslations,
): string {
    const key = error.messageKey
    if (!key) return error.message
    const translated = tr[key]
    if (translated && translated !== FLAT_KEY[key]) return translated
    return ENGLISH[key]
}
