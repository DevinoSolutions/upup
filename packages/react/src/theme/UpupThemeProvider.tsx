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
  const mode = resolved.mode === 'system' ? 'light' : resolved.mode

  return (
    <div data-theme={mode} style={cssVars as React.CSSProperties}>
      {children}
    </div>
  )
}
