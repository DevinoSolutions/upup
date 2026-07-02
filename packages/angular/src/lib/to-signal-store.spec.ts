import { toSignalStore, type HeadlessStore } from './to-signal-store'

function fakeStore<S>(initial: S) {
  let snap = initial
  const ls = new Set<() => void>()
  const store: HeadlessStore<S> & { _set(n: S): void } = {
    subscribe(l) { ls.add(l); return () => ls.delete(l) },
    getSnapshot() { return snap },
    _set(n) { snap = n; ls.forEach(l => l()) },
  }
  return store
}

describe('toSignalStore', () => {
  it('emits the initial snapshot', () => {
    const { state } = toSignalStore(fakeStore({ n: 1 }))
    expect(state().n).toBe(1)
  })
  it('updates when the store changes', () => {
    const s = fakeStore({ n: 1 })
    const { state } = toSignalStore(s)
    s._set({ n: 2 })
    expect(state().n).toBe(2)
  })
  it('destroy unsubscribes', () => {
    const s = fakeStore({ n: 1 })
    const { state, destroy } = toSignalStore(s)
    destroy()
    s._set({ n: 99 })
    expect(state().n).toBe(1)
  })
  it('destroy is idempotent', () => {
    const s = fakeStore({ n: 1 })
    const { destroy } = toSignalStore(s)
    expect(() => { destroy(); destroy() }).not.toThrow()
  })
})
