import type { DriveBrowserError, UiTranslations } from '@useupup/core'

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
 */
export function driveErrorText(
    error: DriveBrowserError,
    tr: UiTranslations,
): string {
    return error.messageKey ? tr[error.messageKey] : error.message
}
