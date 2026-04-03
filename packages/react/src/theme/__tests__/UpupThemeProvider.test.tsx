import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { UpupThemeProvider, useUpupThemeContext } from '../UpupThemeProvider'

describe('UpupThemeProvider', () => {
  it('returns null when no provider wraps the consumer', () => {
    const { result } = renderHook(() => useUpupThemeContext())
    expect(result.current).toBeNull()
  })

  it('provides a value when provider wraps with no props', () => {
    const { result } = renderHook(() => useUpupThemeContext(), {
      wrapper: ({ children }) => (
        <UpupThemeProvider>{children}</UpupThemeProvider>
      ),
    })
    expect(result.current).not.toBeNull()
    expect(result.current!.mode).toBeUndefined()
  })

  it('provides token overrides to children', () => {
    const { result } = renderHook(() => useUpupThemeContext(), {
      wrapper: ({ children }) => (
        <UpupThemeProvider
          mode="dark"
          tokens={{ color: { primary: '#FF0000' } }}
        >
          {children}
        </UpupThemeProvider>
      ),
    })
    expect(result.current).not.toBeNull()
    expect(result.current!.mode).toBe('dark')
    expect(result.current!.tokens?.color?.primary).toBe('#FF0000')
  })
})
