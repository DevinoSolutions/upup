import { getContext, setContext } from 'svelte'
import { writable, type Writable } from 'svelte/store'

/**
 * DOM host inside the SourceView header row, just before the Back button.
 * A source view portals its right-side header extras into it (e.g. the drive
 * browser's avatar + log out + separator) so account controls share the top
 * row instead of occupying their own strip. The store holds null until the host
 * span mounts; consumers guard their portal on it. Svelte has no <Teleport>, so
 * the DOM-host + `portal` action below is the framework idiom mirroring React's
 * SourceViewHeaderExtraContext / Vue's <Teleport>.
 */
const SourceViewHeaderExtraKey = Symbol('upup-source-view-header-extra')

export function provideSourceViewHeaderExtra(): Writable<HTMLElement | null> {
    const store = writable<HTMLElement | null>(null)
    setContext(SourceViewHeaderExtraKey, store)
    return store
}

export function useSourceViewHeaderExtra(): Writable<HTMLElement | null> | null {
    return (
        getContext<Writable<HTMLElement | null> | undefined>(
            SourceViewHeaderExtraKey,
        ) ?? null
    )
}

/**
 * Svelte action: relocate `node` into `target` (the portal). `node` is a
 * `display:contents` wrapper so its children render as if they were direct
 * children of the host — matching React's createPortal / Vue's <Teleport>,
 * which insert the extras as direct siblings of the Back button.
 */
export function portal(
    node: HTMLElement,
    target: HTMLElement | null,
): {
    update(t: HTMLElement | null): void
    destroy(): void
} {
    function mount(t: HTMLElement | null) {
        if (t) t.appendChild(node)
    }
    mount(target)
    return {
        update(t: HTMLElement | null) {
            mount(t)
        },
        destroy() {
            node.remove()
        },
    }
}
