import { readable, type Readable } from 'svelte/store'

/** The subscribe/getSnapshot contract every @upup/core headless store satisfies. */
export interface HeadlessStore<S> {
    subscribe(listener: () => void): () => void
    getSnapshot(): S
}

/**
 * Bridge a headless @upup/core store to a Svelte readable store so components
 * can read its state with `$store` auto-subscription. State mirroring only —
 * `init()`/`destroy()` are the owning component's responsibility (onMount/onDestroy),
 * mirroring the @upup/vue composables and keeping the server render side-effect-free.
 */
export function toReadable<S>(store: HeadlessStore<S>): Readable<S> {
    return readable(store.getSnapshot(), set => {
        const unsub = store.subscribe(() => {
            set(store.getSnapshot())
        })
        return unsub
    })
}
