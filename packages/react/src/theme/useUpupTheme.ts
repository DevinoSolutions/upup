'use client'

import { useMemo } from 'react'
import { resolveTheme, type UpupThemeConfig, type UpupResolvedTheme } from '@upup/shared'
import { useUpupThemeContext } from './UpupThemeProvider'

/**
 * Resolve the final theme for an UpupUploader instance.
 * Merges: defaults -> mode preset -> provider overrides -> instance overrides.
 */
export function useUpupTheme(instanceConfig?: UpupThemeConfig): UpupResolvedTheme {
  const provider = useUpupThemeContext()

  return useMemo(() => {
    const config: UpupThemeConfig = {
      mode: instanceConfig?.mode ?? provider?.mode ?? 'light',
      tokens: instanceConfig?.tokens,
      slots: instanceConfig?.slots,
    }
    return resolveTheme(config, provider?.tokens, provider?.slots)
  }, [instanceConfig, provider])
}
