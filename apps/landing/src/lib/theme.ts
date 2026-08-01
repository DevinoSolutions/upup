/**
 * The one theme-resolution implementation for the landing app.
 *
 * MUST STAY IN SYNC with the inline `theme-script` in src/app/layout.tsx —
 * that script runs before hydration (so it cannot import a module) and has to
 * reach the exact same class state this module produces, or the pre-paint theme
 * and the React-side theme disagree for one frame.
 *
 * Class semantics are add/remove, never `className = theme`: the root element
 * carries other classes (`data-theme-ready` siblings, extension-injected ones,
 * anything a future layout adds) and a whole-attribute assignment wipes them.
 */

export type ThemeName = 'light' | 'dark'

/** localStorage preference, else the OS preference, else light. */
export function resolveTheme(): ThemeName {
    try {
        const saved = localStorage.getItem('theme')
        if (saved === 'dark' || saved === 'light') return saved
    } catch {
        // Storage blocked (private mode / third-party-cookie policy) — fall
        // through to the media query.
    }
    try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
    } catch {
        return 'light'
    }
}

/** Put the document in `theme` and persist it. */
export function applyTheme(theme: ThemeName): void {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    try {
        localStorage.setItem('theme', theme)
    } catch {
        // Persistence is best-effort; the class is what actually themes the page.
    }
}
