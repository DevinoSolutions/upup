import { signal, type Signal } from '@angular/core'

/** The subscribe/getSnapshot contract every @upup/core headless store satisfies. */
export interface HeadlessStore<S> {
  subscribe(listener: () => void): () => void
  getSnapshot(): S
}

export interface SignalStore<S> {
  state: Signal<S>
  dispose: () => void
}

/**
 * Bridge a headless @upup/core store to an Angular signal. State mirroring only —
 * init()/destroy() stay the caller's responsibility (Angular ngOnInit/DestroyRef),
 * mirroring @upup/svelte's toReadable and keeping SSR side-effect-free.
 * The orchestrator returns a fresh snapshot object on every change, so the signal's
 * default Object.is equality fires on real changes and stays quiet otherwise.
 */
export function toSignalStore<S>(store: HeadlessStore<S>): SignalStore<S> {
  const state = signal<S>(store.getSnapshot())
  const unsub = store.subscribe(() => state.set(store.getSnapshot()))
  return { state, dispose: unsub }
}
