'use client'
import React from 'react'
import { resolveTheme, tokensToVars } from '@upup/shared'
import type { UpupThemeConfig } from '@upup/shared'

interface UpupThemeProviderProps {
  theme?: UpupThemeConfig
  children: React.ReactNode
}

export function UpupThemeProvider({ theme, children }: UpupThemeProviderProps) {
  const resolved = resolveTheme(theme)
  const cssVars = tokensToVars(resolved.tokens)
  const resolvedMode = resolved.mode === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : resolved.mode

  return (
    <div
      data-theme={resolvedMode}
      style={{ display: 'block', width: '100%', height: '100%', ...cssVars } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
