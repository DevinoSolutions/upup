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
  tokensToVars,
  type UpupThemeConfig,
  type Translator,
} from '@upup/shared'
import type { UploaderIcons } from './types/icons'
import { type UpupI18nProp, isByoTranslator } from './types/i18n'
import { useUpupTheme } from './theme/useUpupTheme'
import { deriveDataState } from './theme/data-state'
import { cn } from './lib/tailwind'

export interface UpupUploaderProps extends CoreOptions {
  mini?: boolean
  icons?: Partial<UploaderIcons>
  sources?: UploadSource[]
  fileSources?: FileSource[]
  enablePaste?: boolean
  /** Unified i18n configuration. Replaces `locale` + `translationOverrides`. */
  i18n?: UpupI18nProp
  /** Theme configuration — replaces old `dark` and `classNames` props */
  theme?: UpupThemeConfig
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
      mini = false,
      icons = {},
      sources = ['local'],
      fileSources: explicitFileSources,
      enablePaste = false,
      i18n: i18nProp,
      theme,
      ...coreOptions
    } = props

    const uploader = useUpupUpload(coreOptions)
    const [activeSource, setActiveSource] = useState<FileSource | null>(null)
    const informer = useInformer()
    const resolvedTheme = useUpupTheme(theme)
    const cssVars = useMemo(() => tokensToVars(resolvedTheme.tokens), [resolvedTheme.tokens])

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

    const limit = coreOptions.limit

    const contextValue: UploaderContextValue = useMemo(
      () => ({
        ...uploader,
        activeSource,
        setActiveSource,
        resolvedTheme,
        cssVars,
        mini,
        icons: icons as UploaderIcons,
        enablePaste,
        sources,
        limit,
        t,
      }),
      [uploader, activeSource, resolvedTheme, cssVars, mini, icons, enablePaste, sources, limit, t],
    )

    const hasMultipleSources = fileSources.length > 1

    const content = (
      <UploaderContext.Provider value={contextValue}>
        <div
          className={cn(
            'upup-scope upup-container upup-shadow-wrapper upup-rounded-2xl upup-flex upup-flex-col upup-gap-3',
            mini
              ? 'upup-mini upup-max-w-[280px]'
              : 'upup-h-[480px] upup-max-w-[600px] upup-px-5 upup-py-4',
          )}
          style={{
            ...(cssVars as React.CSSProperties),
            backgroundColor: 'var(--upup-color-surface)',
          }}
          data-theme={resolvedTheme.mode === 'dark' ? 'dark' : 'light'}
          data-state={deriveDataState(uploader.status, false)}
          data-upup-slot="uploader.root"
          lang={t.locale}
          dir={t.dir}
        >
          {!mini && limit !== undefined && limit > 1 && (
            <p
              className="upup-text-center upup-text-sm upup-font-medium"
              style={{ color: 'var(--upup-color-text-muted)' }}
              data-upup-slot="uploader.header"
            >
              {t('dropzone.addDocumentsHere', { limit })}
            </p>
          )}
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
          />
          {!mini && (
            <div
              className="upup-flex upup-items-center upup-justify-center upup-gap-1 upup-text-xs"
              style={{ color: 'var(--upup-color-text-muted)' }}
              data-upup-slot="uploader.footer"
            >
              <a
                href="https://upup.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="upup-font-semibold"
                style={{ color: 'var(--upup-color-primary-hover)' }}
              >
                upup
              </a>
              <span>{'·'}</span>
              <span>Built by</span>
              <a
                href="https://devino.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="upup-font-semibold"
                style={{ color: 'var(--upup-color-primary-hover)' }}
              >
                devino
              </a>
            </div>
          )}
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
