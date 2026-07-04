import { signal, type Signal } from '@angular/core'

/** The subscribe/getSnapshot contract every @upup/core headless store satisfies. */
export interface HeadlessStore<S> {
    subscribe(listener: () => void): () => void
    getSnapshot(): S
}

/** The Angular-signal view returned by toSignalStore. Call destroy() in ngOnDestroy / DestroyRef. */
export interface SignalStore<S> {
    state: Signal<S>
    destroy: () => void
}

/**
 * Bridge a headless @upup/core store to an Angular signal. State mirroring only —
 * init()/destroy() stay the caller's responsibility (Angular ngOnInit/DestroyRef),
 * mirroring @upup/svelte's toReadable and keeping SSR side-effect-free.
 * The orchestrator returns a fresh snapshot object on every change, so Object.is
 * (the signal default) always sees a new reference, ensuring no real update is
 * silently dropped. destroy() is idempotent — safe to call more than once.
 */
export function toSignalStore<S>(store: HeadlessStore<S>): SignalStore<S> {
    const state = signal<S>(store.getSnapshot())
    let active = true
    const unsub = store.subscribe(() => state.set(store.getSnapshot()))
    return {
        state,
        destroy: () => {
            if (!active) return
            active = false
            unsub()
        },
    }
}
