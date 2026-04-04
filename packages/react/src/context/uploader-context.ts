'use client'

import { createContext, useContext } from 'react'
import type { UseUpupUploadReturn } from '../use-upup-upload'
import type { FileSource, UpupResolvedTheme, Translator } from '@upup/shared'
import type { UploaderIcons } from '../types/icons'

export type UploadSource = 'local' | 'camera' | 'url' | 'google_drive' | 'onedrive' | 'dropbox' | 'microphone' | 'screen'

export interface UploaderUIState {
  activeSource: FileSource | null
  setActiveSource: (source: FileSource | null) => void
  resolvedTheme: UpupResolvedTheme
  /** Flat CSS variable map for the style attribute */
  cssVars: Record<string, string>
  mini: boolean
  icons: UploaderIcons
  enablePaste: boolean
  sources: UploadSource[]
  /** Max number of files (from CoreOptions.limit) */
  limit?: number
  /** The translator function -- use `t('namespace.key', { values })` */
  t: Translator
}

export type UploaderContextValue = UseUpupUploadReturn & UploaderUIState

export const UploaderContext = createContext<UploaderContextValue | null>(null)

export function useUploaderContext(): UploaderContextValue {
  const ctx = useContext(UploaderContext)
  if (!ctx) {
    throw new Error('useUploaderContext must be used within <UpupUploader>')
  }
  return ctx
}
