'use client'

import React, { createContext, useContext, useMemo, type ReactNode } from 'react'
import type {
  UpupThemeMode,
  UpupThemeTokens,
  UpupThemeSlots,
  DeepPartial,
} from '@upup/shared'

export interface UpupThemeProviderProps {
  children: ReactNode
  mode?: UpupThemeMode
  tokens?: DeepPartial<UpupThemeTokens>
  slots?: DeepPartial<UpupThemeSlots>
}

export interface UpupThemeProviderValue {
  mode?: UpupThemeMode
  tokens?: DeepPartial<UpupThemeTokens>
  slots?: DeepPartial<UpupThemeSlots>
}

const UpupThemeContext = createContext<UpupThemeProviderValue | null>(null)

export function UpupThemeProvider({
  children,
  mode,
  tokens,
  slots,
}: UpupThemeProviderProps) {
  const value = useMemo<UpupThemeProviderValue>(
    () => ({ mode, tokens, slots }),
    [mode, tokens, slots],
  )

  return (
    <UpupThemeContext.Provider value={value}>
      {children}
    </UpupThemeContext.Provider>
  )
}

/**
 * Returns the provider-level theme context, or null if no provider.
 */
export function useUpupThemeContext(): UpupThemeProviderValue | null {
  return useContext(UpupThemeContext)
}
