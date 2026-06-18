import { describe, it, expect, vi } from 'vitest'

const received: { req?: Request } = {}
vi.mock('@upup/server', () => ({
  createHandler: () => async (req: Request) => {
    received.req = req
    return new Response('{}', { status: 200 })
  },
  InMemoryTokenStore: class {},
}))

import { createUpupHandler } from '../server'

describe('createUpupHandler', () => {
  it('returns GET/POST/PUT/DELETE handlers', () => {
    const h = createUpupHandler({} as any)
    expect(typeof h.GET).toBe('function')
    expect(typeof h.POST).toBe('function')
    expect(typeof h.PUT).toBe('function')
    expect(typeof h.DELETE).toBe('function')
  })

  it('normalizes the request origin before delegating (baseUrl)', async () => {
    const h = createUpupHandler({} as any, { baseUrl: 'https://app.example.com' })
    await h.POST(new Request('https://internal.local/api/upup/presign'))
    expect(new URL(received.req!.url).origin).toBe('https://app.example.com')
  })
})
