import { h, type ComponentChildren, type JSX } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { FileSource, UpupCore, UploadStatus, type CoreOptions, type UploadFile } from '@upup/core'
import { defineUpupElement } from '@upup/vanilla'

export { FileSource, StorageProvider, UploadStatus } from '@upup/core'
export type { CoreOptions, UploadFile } from '@upup/core'

export interface UpupUploaderProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'children'> {
  uploadEndpoint?: string
  serverUrl?: string
  mode?: CoreOptions['mode']
  sources?: FileSource[] | string
  maxFiles?: number
  accept?: string
  enablePaste?: boolean
  theme?: 'light' | 'dark'
  locale?: string
  dir?: 'ltr' | 'rtl' | 'auto'
  children?: ComponentChildren
}

function sourcesAttr(sources: UpupUploaderProps['sources']) {
  return Array.isArray(sources) ? sources.join(',') : sources
}

export function UpupUploader({
  uploadEndpoint,
  serverUrl,
  mode,
  sources,
  maxFiles,
  accept,
  enablePaste,
  theme,
  locale,
  dir,
  children,
  ...rest
}: UpupUploaderProps) {
  useEffect(() => {
    defineUpupElement()
  }, [])

  return h(
    'upup-uploader',
    {
      ...rest,
      'upload-endpoint': uploadEndpoint,
      'server-url': serverUrl,
      mode,
      sources: sourcesAttr(sources),
      'max-files': maxFiles,
      accept,
      'enable-paste': enablePaste ? '' : undefined,
      theme,
      locale,
      dir,
    } as Record<string, unknown>,
    children,
  )
}

export interface UseUpupUploadOptions extends CoreOptions {}

export function useUpupUpload(options: UseUpupUploadOptions) {
  const optionsRef = useRef(options)
  optionsRef.current = options
  const core = useMemo(() => new UpupCore(optionsRef.current), [])
  const [files, setFiles] = useState<UploadFile[]>([...core.files.values()])
  const [status, setStatus] = useState<UploadStatus>(core.status)

  useEffect(() => {
    core.updateOptions(optionsRef.current)
  })

  useEffect(() => {
    const sync = () => {
      setFiles([...core.files.values()])
      setStatus(core.status)
    }
    const offState = core.on('state-change', sync)
    const offAdded = core.on('files-added', sync)
    const offRemoved = core.on('file-removed', sync)
    const offCleared = core.on('files-cleared', sync)
    return () => {
      offState()
      offAdded()
      offRemoved()
      offCleared()
      core.destroy()
    }
  }, [core])

  return {
    core,
    files,
    status,
    addFiles: (filesToAdd: File[]) => core.addFiles(filesToAdd),
    removeFile: (id: string) => core.removeFile(id),
    removeAll: () => core.removeAll(),
    upload: () => core.upload(),
  }
}

