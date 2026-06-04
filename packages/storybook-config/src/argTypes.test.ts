// src/argTypes.test.ts
import { describe, it, expect } from 'vitest'
import { uploaderArgTypes, uploaderDefaultArgs, VIRTUAL_ARGS } from './argTypes'

const ALLOWED = new Set([
  'boolean', 'number', 'text', 'color', 'select', 'multi-select', 'object',
])

describe('uploaderArgTypes', () => {
  it('assigns every control to a table category', () => {
    for (const [name, def] of Object.entries(uploaderArgTypes)) {
      expect(def, name).toHaveProperty('table.category')
    }
  })
  it('only uses known control types', () => {
    for (const [name, def] of Object.entries(uploaderArgTypes)) {
      const ctrl = (def as any).control
      const type = typeof ctrl === 'string' ? ctrl : ctrl?.type
      if (!type) continue // action-only args have no control
      expect(ALLOWED.has(type), `${name}:${type}`).toBe(true)
    }
  })
  it('wires event handlers to the actions panel', () => {
    expect((uploaderArgTypes.onUploadComplete as any).action).toBe('onUploadComplete')
    expect((uploaderArgTypes.onError as any).action).toBe('onError')
  })
  it('points uploads at the mocked presign endpoint by default', () => {
    expect(uploaderDefaultArgs.uploadEndpoint).toBe('/api/upup-mock/presign')
    expect(uploaderDefaultArgs.provider).toBe('aws')
  })
  it('declares the virtual (render-mapped) args', () => {
    expect(VIRTUAL_ARGS).toContain('themeMode')
    expect(VIRTUAL_ARGS).toContain('primaryColor')
  })
})
