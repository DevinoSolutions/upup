'use client'

import { forwardRef, useImperativeHandle, useState, useMemo, type Ref } from 'react'
import { useUpupUpload, type UseUpupUploadReturn } from './use-upup-upload'
import { UploaderContext, type UploadSource, type UploaderContextValue } from './context/uploader-context'
import { PasteZone } from './components/paste-zone'
import DropZone from './components/drop-zone'
import SourceSelector from './components/source-selector'
import SourceView from './components/source-view'
import FileList from './components/file-list'
import Notifier from './components/notifier'
import useInformer from './hooks/use-informer'
import type { CoreOptions } from '@upup/core'
import {
  FileSource,
  enUS,
  createTranslator,
  type UploaderClassNames,
  type Translator,
} from '@upup/shared'
import type { UploaderIcons } from './types/icons'
import { type UpupI18nProp, isByoTranslator } from './types/i18n'

export interface UpupUploaderProps extends CoreOptions {
  dark?: boolean
  mini?: boolean
  classNames?: Partial<UploaderClassNames>
  icons?: Partial<UploaderIcons>
  sources?: UploadSource[]
  fileSources?: FileSource[]
  enablePaste?: boolean
  /** Unified i18n configuration. Replaces `locale` + `translationOverrides`. */
  i18n?: UpupI18nProp
  ref?: Ref<UpupUploaderRef>
}

export interface UpupUploaderRef {
  useUpload(): UseUpupUploadReturn
}

function sourcesToFileSources(sources: UploadSource[]): FileSource[] {
  const map: Record<UploadSource, FileSource> = {
    local: FileSource.LOCAL,
    camera: FileSource.CAMERA,
    url: FileSource.URL,
    google_drive: FileSource.GOOGLE_DRIVE,
    onedrive: FileSource.ONE_DRIVE,
    dropbox: FileSource.DROPBOX,
    microphone: FileSource.MICROPHONE,
    screen: FileSource.SCREEN,
  }
  return sources.map(s => map[s])
}

export const UpupUploader = forwardRef<UpupUploaderRef, UpupUploaderProps>(
  function UpupUploader(props, ref) {
    const {
      dark = false,
      mini = false,
      classNames = {},
      icons = {},
      sources = ['local'],
      fileSources: explicitFileSources,
      enablePaste = false,
      i18n: i18nProp,
      ...coreOptions
    } = props

    const uploader = useUpupUpload(coreOptions)
    const [activeSource, setActiveSource] = useState<FileSource | null>(null)
    const informer = useInformer()

    const t: Translator = useMemo(() => {
      if (i18nProp && isByoTranslator(i18nProp)) {
        return i18nProp.t
      }
      const config = i18nProp ?? {}
      return createTranslator({
        bundle: ('bundle' in config && config.bundle) ? config.bundle : enUS,
        overrides: 'overrides' in config ? config.overrides : undefined,
        onMissingKey: 'onMissingKey' in config ? config.onMissingKey : undefined,
        loadLocale: 'loadLocale' in config ? config.loadLocale : undefined,
      })
    }, [i18nProp])
    const fileSources = explicitFileSources ?? sourcesToFileSources(sources)

    useImperativeHandle(ref, () => ({
      useUpload: () => uploader,
    }))

    const contextValue: UploaderContextValue = useMemo(
      () => ({
        ...uploader,
        activeSource,
        setActiveSource,
        dark,
        mini,
        classNames: classNames as UploaderClassNames,
        icons: icons as UploaderIcons,
        enablePaste,
        sources,
        t,
      }),
      [uploader, activeSource, dark, mini, classNames, icons, enablePaste, sources, t],
    )

    const hasMultipleSources = fileSources.length > 1

    const content = (
      <UploaderContext.Provider value={contextValue}>
        <div
          className={`upup-container ${dark ? 'upup-dark' : ''} ${mini ? 'upup-mini' : ''}`}
          lang={t.locale}
          dir={t.dir}
        >
          <DropZone>
            {activeSource ? (
              <SourceView />
            ) : (
              <SourceSelector />
            )}
          </DropZone>
          <FileList />
          <Notifier
            messages={informer.messages}
            onDismiss={informer.dismissMessage}
            dark={dark}
          />
        </div>
      </UploaderContext.Provider>
    )

    if (enablePaste) {
      return (
        <PasteZone onPaste={(files) => uploader.addFiles(files)}>
          {content}
        </PasteZone>
      )
    }

    return content
  },
)
