import { describe, it, expect } from 'vitest'
import { InMemoryTokenStore } from '../src/tokenStore'

describe('InMemoryTokenStore ttl semantics', () => {
  it('ttl=0 means already-expired (not stored forever)', async () => {
    const store = new InMemoryTokenStore()
    await store.set('k', 'v', 0)
    expect(await store.get('k')).toBeNull()
  })

  it('ttl=undefined stores without expiry', async () => {
    const store = new InMemoryTokenStore()
    await store.set('k', 'v', undefined)
    expect(await store.get('k')).toBe('v')
  })

  it('ttl>0 stores and is retrievable before expiry', async () => {
    const store = new InMemoryTokenStore()
    await store.set('k', 'v', 3600)
    expect(await store.get('k')).toBe('v')
  })
})
