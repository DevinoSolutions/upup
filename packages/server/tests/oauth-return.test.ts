// packages/server/tests/oauth-return.test.ts
import { describe, it, expect } from 'vitest'
import {
  validateReturnTo,
  concreteAllowedOrigins,
  buildOAuthSuccessPage,
} from '../src/handler'

// ---------------------------------------------------------------------------
// validateReturnTo
// ---------------------------------------------------------------------------
describe('validateReturnTo', () => {
  const serverUrl = 'https://srv.example/auth/google-drive/cb'
  const req = new Request(serverUrl)

  it('allows a relative path (resolves to same-origin)', () => {
    const result = validateReturnTo('/done', req, undefined)
    expect(result).toBe('https://srv.example/done')
  })

  it('allows an absolute same-origin URL', () => {
    const result = validateReturnTo('https://srv.example/app', req, undefined)
    expect(result).toBe('https://srv.example/app')
  })

  it('rejects cross-origin not in the allowlist', () => {
    const result = validateReturnTo(
      'https://evil.example/x',
      req,
      { allowedOrigins: ['https://trusted.example'] },
    )
    expect(result).toBeUndefined()
  })

  it('allows cross-origin when cors.allowedOrigins includes the origin', () => {
    const result = validateReturnTo(
      'https://app.example/done',
      req,
      { allowedOrigins: ['https://app.example'] },
    )
    expect(result).toBe('https://app.example/done')
  })

  it('rejects cross-origin even when cors.allowedOrigins contains only wildcard', () => {
    const result = validateReturnTo(
      'https://evil.example/x',
      req,
      { allowedOrigins: ['*'] },
    )
    expect(result).toBeUndefined()
  })

  it('returns undefined for garbage input (javascript: scheme has null origin, not in allowlist)', () => {
    // javascript: URLs parse but have origin "null", which is never same-origin and never in the allowlist
    expect(validateReturnTo('javascript:alert(1)', req, undefined)).toBeUndefined()
  })

  it('returns undefined when returnTo is undefined', () => {
    expect(validateReturnTo(undefined, req, undefined)).toBeUndefined()
  })

  it('returns undefined when cors is undefined and cross-origin given', () => {
    const result = validateReturnTo('https://other.example/page', req, undefined)
    expect(result).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// concreteAllowedOrigins
// ---------------------------------------------------------------------------
describe('concreteAllowedOrigins', () => {
  it('filters out wildcard entries', () => {
    expect(concreteAllowedOrigins({ allowedOrigins: ['*', 'https://app.example'] })).toEqual([
      'https://app.example',
    ])
  })

  it('returns empty array when only wildcard present', () => {
    expect(concreteAllowedOrigins({ allowedOrigins: ['*'] })).toEqual([])
  })

  it('returns empty array when cors is undefined', () => {
    expect(concreteAllowedOrigins(undefined)).toEqual([])
  })

  it('returns all non-wildcard origins', () => {
    expect(
      concreteAllowedOrigins({
        allowedOrigins: ['https://a.example', 'https://b.example'],
      }),
    ).toEqual(['https://a.example', 'https://b.example'])
  })
})

// ---------------------------------------------------------------------------
// buildOAuthSuccessPage
// ---------------------------------------------------------------------------
describe('buildOAuthSuccessPage', () => {
  it('targets concrete origins in postMessage when targetOrigins is non-empty', () => {
    const html = buildOAuthSuccessPage('google-drive', {
      targetOrigins: ['https://app.example'],
    })
    expect(html).toContain('"https://app.example"')
    // Must NOT fall back to wildcard postMessage
    expect(html).not.toMatch(/postMessage\([^)]*['"]\*['"]/s)
  })

  it('targets all provided origins when multiple are given', () => {
    const html = buildOAuthSuccessPage('google-drive', {
      targetOrigins: ['https://a.example', 'https://b.example'],
    })
    expect(html).toContain('"https://a.example"')
    expect(html).toContain('"https://b.example"')
    expect(html).not.toMatch(/postMessage\([^)]*['"]\*['"]/s)
  })

  it('falls back to wildcard postMessage when targetOrigins is empty', () => {
    const html = buildOAuthSuccessPage('google-drive', { targetOrigins: [] })
    expect(html).toContain("'*'")
  })

  it('wildcard fallback payload contains only type and provider (no secrets)', () => {
    const html = buildOAuthSuccessPage('google-drive', { targetOrigins: [] })
    // Extract the object literal passed to postMessage
    const match = html.match(/postMessage\(\s*(\{[^}]+\})/)
    expect(match).not.toBeNull()
    const payload = match![1]
    expect(payload).toContain('type')
    expect(payload).toContain('provider')
    // Must not contain any token/secret/key/credential field
    expect(payload).not.toMatch(/token|secret|key|access|refresh|credential/i)
  })

  it('includes window.location.replace when a validated returnTo is provided', () => {
    const html = buildOAuthSuccessPage('google-drive', {
      returnTo: 'https://srv.example/done',
      targetOrigins: [],
    })
    expect(html).toContain('window.location.replace(')
    expect(html).toContain('"https://srv.example/done"')
  })

  it('shows "you may close" fallback when no returnTo', () => {
    const html = buildOAuthSuccessPage('google-drive', { targetOrigins: [] })
    expect(html).toContain('You may close this window')
    expect(html).not.toContain('location.replace(')
  })

  it('strips non-alphanumeric/dash chars from provider name', () => {
    const html = buildOAuthSuccessPage('google<script>', { targetOrigins: [] })
    // The raw unsanitized provider string must not appear literally in the output
    expect(html).not.toContain('google<script>')
    // The sanitized form (angle brackets stripped) must appear
    expect(html).toContain('googlescript')
  })
})
