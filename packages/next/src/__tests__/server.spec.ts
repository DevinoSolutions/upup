import { describe, it, expect } from 'vitest'
import * as serverEntry from '../server'
import * as upstream from '@upup/server/next'

// The App Router handler + origin utils live in @upup/server/next; this entry
// must re-export the SAME functions (behavior is tested in @upup/server).
describe('@upup/next/server re-exports', () => {
  it('createUpupNextHandler is the @upup/server/next function', () => {
    expect(serverEntry.createUpupNextHandler).toBe(upstream.createUpupNextHandler)
  })

  it('origin utils are the @upup/server/next functions', () => {
    expect(serverEntry.normalizeRequestOrigin).toBe(upstream.normalizeRequestOrigin)
    expect(serverEntry.resolveOrigin).toBe(upstream.resolveOrigin)
  })
})
