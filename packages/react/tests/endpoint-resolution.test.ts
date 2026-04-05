import { describe, it, expect } from 'vitest'

// Test endpoint resolution priority: tokenEndpoint > uploadEndpoint > serverUrl/presign > apiKey/managed
function resolveEndpoint(opts: {
  tokenEndpoint?: string
  uploadEndpoint?: string
  serverUrl?: string
  apiKey?: string
}): string {
  const resolvedServerUrl = opts.serverUrl ?? (opts.apiKey ? 'https://api.upup.dev/v1' : undefined)
  return opts.tokenEndpoint ?? opts.uploadEndpoint ?? (resolvedServerUrl ? `${resolvedServerUrl}/presign` : '')
}

describe('endpoint resolution', () => {
  it('tokenEndpoint takes highest priority', () => {
    expect(resolveEndpoint({
      tokenEndpoint: '/api/token',
      uploadEndpoint: '/api/upload',
      serverUrl: '/api/server',
    })).toBe('/api/token')
  })

  it('uploadEndpoint is second priority', () => {
    expect(resolveEndpoint({
      uploadEndpoint: '/api/upload',
      serverUrl: '/api/server',
    })).toBe('/api/upload')
  })

  it('serverUrl appends /presign', () => {
    expect(resolveEndpoint({
      serverUrl: '/api/upup',
    })).toBe('/api/upup/presign')
  })

  it('apiKey auto-sets managed serverUrl', () => {
    expect(resolveEndpoint({
      apiKey: 'upup_live_xxx',
    })).toBe('https://api.upup.dev/v1/presign')
  })

  it('returns empty string when nothing provided', () => {
    expect(resolveEndpoint({})).toBe('')
  })

  it('serverUrl takes precedence over apiKey', () => {
    expect(resolveEndpoint({
      serverUrl: '/my/server',
      apiKey: 'upup_live_xxx',
    })).toBe('/my/server/presign')
  })
})
