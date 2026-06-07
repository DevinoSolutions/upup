import { describe, it, expect } from 'vitest'
import { get } from 'svelte/store'
import { toReadable } from '../src/lib/to-readable'

/** Minimal headless store matching the subscribe/getSnapshot contract. */
function makeStore(initial: number) {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    set(v: number) { state = v; listeners.forEach(l => l()) },
    subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l) },
    getSnapshot() { return state },
    listenerCount() { return listeners.size },
  }
}

describe('toReadable', () => {
  it('exposes the current snapshot via get()', () => {
    const s = makeStore(1)
    const r = toReadable(s)
    expect(get(r)).toBe(1)
  })

  it('notifies Svelte subscribers when the source changes', () => {
    const s = makeStore(1)
    const r = toReadable(s)
    const seen: number[] = []
    const unsub = r.subscribe(v => seen.push(v))
    s.set(2)
    s.set(3)
    unsub()
    expect(seen).toEqual([1, 2, 3])
  })

  it('unsubscribes from the source when the last Svelte subscriber leaves', () => {
    const s = makeStore(0)
    const r = toReadable(s)
    const unsub = r.subscribe(() => {})
    expect(s.listenerCount()).toBe(1)
    unsub()
    expect(s.listenerCount()).toBe(0)
  })
})
