import { writable, type Readable } from 'svelte/store'
import { FileSource, UpupCore, UploadStatus, type CoreOptions, type UploadFile } from '@upup/core'
import { defineUpupElement } from '@upup/vanilla'

export { FileSource, StorageProvider, UploadStatus } from '@upup/core'
export type { CoreOptions, UploadFile } from '@upup/core'

export interface UpupUploaderActionOptions {
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
}

function sourcesAttr(sources: UpupUploaderActionOptions['sources']) {
  return Array.isArray(sources) ? sources.join(',') : sources
}

function setOptionalAttribute(element: HTMLElement, name: string, value: unknown) {
  if (value === undefined || value === null || value === false) {
    element.removeAttribute(name)
    return
  }
  element.setAttribute(name, value === true ? '' : String(value))
}

function applyOptions(element: HTMLElement, options: UpupUploaderActionOptions) {
  setOptionalAttribute(element, 'upload-endpoint', options.uploadEndpoint)
  setOptionalAttribute(element, 'server-url', options.serverUrl)
  setOptionalAttribute(element, 'mode', options.mode)
  setOptionalAttribute(element, 'sources', sourcesAttr(options.sources))
  setOptionalAttribute(element, 'max-files', options.maxFiles)
  setOptionalAttribute(element, 'accept', options.accept)
  setOptionalAttribute(element, 'enable-paste', options.enablePaste)
  setOptionalAttribute(element, 'theme', options.theme)
  setOptionalAttribute(element, 'locale', options.locale)
  setOptionalAttribute(element, 'dir', options.dir)
}

export function upupUploader(node: HTMLElement, options: UpupUploaderActionOptions = {}) {
  defineUpupElement()
  const element = document.createElement('upup-uploader')
  applyOptions(element, options)
  node.replaceChildren(element)

  return {
    update(nextOptions: UpupUploaderActionOptions = {}) {
      applyOptions(element, nextOptions)
    },
    destroy() {
      node.replaceChildren()
    },
  }
}

export interface UpupUploadStore {
  core: UpupCore
  files: Readable<UploadFile[]>
  status: Readable<UploadStatus>
  addFiles(files: File[]): Promise<void>
  removeFile(id: string): void
  removeAll(): void
  upload(): Promise<UploadFile[]>
  destroy(): void
}

export function createUpupUploadStore(options: CoreOptions): UpupUploadStore {
  const core = new UpupCore(options)
  const files = writable<UploadFile[]>([...core.files.values()])
  const status = writable<UploadStatus>(core.status)
  const sync = () => {
    files.set([...core.files.values()])
    status.set(core.status)
  }
  const unsubscribers = [
    core.on('state-change', sync),
    core.on('files-added', sync),
    core.on('file-removed', sync),
    core.on('files-cleared', sync),
  ]

  return {
    core,
    files,
    status,
    addFiles: filesToAdd => core.addFiles(filesToAdd),
    removeFile: id => core.removeFile(id),
    removeAll: () => core.removeAll(),
    upload: () => core.upload(),
    destroy() {
      for (const unsubscribe of unsubscribers) unsubscribe()
      core.destroy()
    },
  }
}

