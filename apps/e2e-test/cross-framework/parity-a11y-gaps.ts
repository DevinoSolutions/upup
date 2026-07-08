/**
 * Tracked cross-framework a11y parity gaps: React-first features that have
 * not yet been ported to the other five frameworks. Single source of truth —
 * consumed by both the normalizer (as `$eval` args, since normalizeElement
 * must stay self-contained/serializable) and the forcing-check in
 * parity.spec.ts. Replacing two previously-hardcoded skip sites.
 */
export interface A11yGap {
    id: string
    kind: 'class' | 'role'
    token: string
    reason: string
    /** Frameworks that already carry this feature. */
    ported: string[]
}

// preact is a compat re-export of @upup/react (packages/preact has no FileList
// of its own -- confirmed via source grep), so it renders the SAME DOM as
// react and genuinely carries every React-first a11y feature below. `ported`
// lists both.
export const A11Y_GAPS: A11yGap[] = [
    {
        id: 'sr-only-live-region',
        kind: 'class',
        token: 'upup-sr-only',
        reason: 'C1 ported the aria-live status region to all six frameworks',
        ported: ['react', 'vue', 'svelte', 'vanilla', 'angular', 'preact'],
    },
    {
        id: 'list-role',
        kind: 'role',
        token: 'list',
        reason: 'React-first list semantics (Phase 3); not yet ported to vue/svelte/vanilla/angular',
        ported: ['react', 'preact'],
    },
    {
        id: 'listitem-role',
        kind: 'role',
        token: 'listitem',
        reason: 'React-first list semantics (Phase 3); not yet ported to vue/svelte/vanilla/angular',
        ported: ['react', 'preact'],
    },
]

export const gapSkipClasses = () =>
    A11Y_GAPS.filter(g => g.kind === 'class').map(g => g.token)
export const gapSkipRoles = () =>
    A11Y_GAPS.filter(g => g.kind === 'role').map(g => g.token)
