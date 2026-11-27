import {
    createElement,
    lazy,
    useState,
    type ComponentType,
    type LazyExoticComponent,
} from 'react'

export type PreloadableComponent<P> = ComponentType<P> & {
    /** Start fetching the chunk. Safe to call repeatedly; failures are swallowed. */
    preload: () => Promise<void>
    /** True once the chunk has arrived and the component renders without suspending. */
    isLoaded: () => boolean
}

/**
 * `React.lazy` that can be warmed up ahead of its first render.
 *
 * Warming the module cache is not enough on its own: `lazy` always suspends on
 * its first render, even for a module that is already loaded, because its
 * thenable settles in a microtask. For a source tile that is one render too
 * many: the click mounts the Suspense fallback, and the view's effects (the
 * drive sign-in popup) only run after the chunk-resolved commit, in a later
 * task than the click, where a strict popup blocker refuses `window.open`.
 *
 * Once `preload()` has resolved, this component renders the loaded component
 * directly, so a click-driven mount commits, and runs its effects, inside the
 * click. Before that it falls back to the plain `lazy` path, which also works.
 * The chunk stays a separate chunk: only the `load` callback imports it.
 */
export function preloadableLazy<P extends object>(
    load: () => Promise<{ default: ComponentType<P> }>,
): PreloadableComponent<P> {
    let loaded: ComponentType<P> | undefined
    let inFlight: Promise<{ default: ComponentType<P> }> | undefined

    // One shared load for preload() and the lazy path. A failure clears it so
    // the next attempt retries instead of replaying a cached rejection.
    const ensureLoaded = (): Promise<{ default: ComponentType<P> }> =>
        (inFlight ??= load().then(
            mod => {
                loaded = mod.default
                return mod
            },
            (err: unknown) => {
                inFlight = undefined
                throw err
            },
        ))

    const Lazy: LazyExoticComponent<ComponentType<P>> = lazy(ensureLoaded)

    function Preloadable(props: P) {
        // Fixed at first render so a mounted view never swaps component type.
        const [Impl] = useState<ComponentType<P>>(() => loaded ?? Lazy)
        return createElement(Impl, props)
    }

    Preloadable.preload = (): Promise<void> =>
        ensureLoaded().then(
            () => undefined,
            () => {
                // upup-catch: a failed warm-up is not an error by itself; the
                // lazy path re-runs the load on the click and reports there.
            },
        )
    Preloadable.isLoaded = (): boolean => loaded !== undefined

    return Preloadable
}
