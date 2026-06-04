// src/msw/handlers.test.ts
import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { uploadHandlers } from './handlers'

const server = setupServer(...uploadHandlers)
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('uploadHandlers', () => {
  it('presign returns a usable object URL', async () => {
    const res = await fetch('https://example.test/api/upup-mock/presign', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Photo.png' }),
    })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.key).toContain('mock/')
    expect(json.uploadUrl).toContain('/api/upup-mock/object/')
    expect(json.expiresIn).toBe(3600)
  })
  it('object PUT succeeds', async () => {
    const res = await fetch('https://example.test/api/upup-mock/object/mock/x.png', {
      method: 'PUT',
      body: 'binary',
    })
    expect(res.status).toBe(200)
  })
})
