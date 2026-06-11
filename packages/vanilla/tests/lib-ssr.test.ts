// tests/lib-ssr.test.ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'

describe('lib/dom resolveTarget (SSR guard)', () => {
  it('throws a descriptive TypeError when document is undefined (SSR)', async () => {
    const { resolveTarget } = await import('../src/lib/dom')
    expect(() => resolveTarget('#any')).toThrow(TypeError)
    expect(() => resolveTarget('#any')).toThrow(
      /@upup\/vanilla: createUploader\(\) must run in a browser/,
    )
  })
})
