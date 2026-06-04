import { createEffect, createSignal, onCleanup, onMount, type JSX } from 'solid-js'
import { FileSource, UpupCore, UploadStatus, type CoreOptions, type UploadFile } from '@upup/core'
import { defineUpupElement } from '@upup/vanilla'
import { upupSolidAttributes, type UpupSolidAttributeProps } from './attrs'

export { FileSource, StorageProvider, UploadStatus } from '@upup/core'
export type { CoreOptions, UploadFile } from '@upup/core'
export { upupSolidAttributes }
export type { UpupSolidAttributeProps }

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'upup-uploader': Record<string, unknown>
    }
  }
}

export interface UpupUploaderProps
  extends UpupSolidAttributeProps,
    Omit<JSX.HTMLAttributes<HTMLElement>, 'children'> {
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
  children?: JSX.Element
}

export function UpupUploader(props: UpupUploaderProps) {
  let uploader: HTMLElement | undefined

  onMount(() => {
    defineUpupElement()
  })

  createEffect(() => {
    if (!uploader) return

    for (const [name, value] of Object.entries(upupSolidAttributes(props))) {
      if (value === undefined || value === null) {
        uploader.removeAttribute(name)
      } else {
        uploader.setAttribute(name, String(value))
      }
    }
  })

  return (
    <upup-uploader ref={(node: HTMLElement) => (uploader = node)}>
      {props.children}
    </upup-uploader>
  )
}

export interface CreateUpupUploadOptions extends CoreOptions {}

export function createUpupUpload(options: CreateUpupUploadOptions) {
  const core = new UpupCore(options)
  const [files, setFiles] = createSignal<UploadFile[]>([...core.files.values()])
  const [status, setStatus] = createSignal<UploadStatus>(core.status)
  const sync = () => {
    setFiles([...core.files.values()])
    setStatus(core.status)
  }
  const unsubscribers = [
    core.on('state-change', sync),
    core.on('files-added', sync),
    core.on('file-removed', sync),
    core.on('files-cleared', sync),
  ]

  onCleanup(() => {
    for (const unsubscribe of unsubscribers) unsubscribe()
    core.destroy()
  })

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
