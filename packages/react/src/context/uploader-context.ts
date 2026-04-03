'use client'

import { createContext, useContext } from 'react'
import type { UseUpupUploadReturn } from '../use-upup-upload'
import type { FileSource, UploaderClassNames, Translator } from '@upup/shared'
import type { UploaderIcons } from '../types/icons'

export type UploadSource = 'local' | 'camera' | 'url' | 'google_drive' | 'onedrive' | 'dropbox' | 'microphone' | 'screen'

export interface UploaderUIState {
  activeSource: FileSource | null
  setActiveSource: (source: FileSource | null) => void
  dark: boolean
  mini: boolean
  classNames: UploaderClassNames
  icons: UploaderIcons
  enablePaste: boolean
  sources: UploadSource[]
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
