import {
  deriveFetchedFileName,
  FileSource,
  UpupCore,
  UploadStatus,
  type CoreEvents,
  type CoreOptions,
  type UploadFile,
} from '@upup/core'

export { FileSource, StorageProvider, UploadStatus } from '@upup/core'
export type { CoreOptions, UploadFile, UploadStatus as UploadStatusType } from '@upup/core'

export type UpupVanillaTheme = 'light' | 'dark'

export interface UpupVanillaOptions extends CoreOptions {
  target: HTMLElement
  sources?: FileSource[]
  enablePaste?: boolean
  theme?: UpupVanillaTheme
  locale?: string
  dir?: 'ltr' | 'rtl' | 'auto'
}

export interface UpupVanillaInstance {
  readonly core: UpupCore
  readonly element: HTMLElement
  addFiles(files: File[]): Promise<void>
  removeFile(id: string): void
  removeAll(): void
  upload(): Promise<UploadFile[]>
  update(options: Partial<Omit<UpupVanillaOptions, 'target'>>): void
  destroy(): void
}

const DEFAULT_SOURCES = [FileSource.LOCAL, FileSource.URL]

function fileListToArray(files: FileList | File[] | null | undefined) {
  return files ? Array.from(files) : []
}

function parseSources(value: string | null) {
  if (!value) return undefined
  const known = new Set(Object.values(FileSource))
  const sources = value
    .split(',')
    .map(source => source.trim())
    .filter((source): source is FileSource => known.has(source as FileSource))
  return sources.length ? sources : undefined
}

function eventFiles(event: DragEvent | ClipboardEvent) {
  const transfer =
    event instanceof DragEvent ? event.dataTransfer : event.clipboardData
  return fileListToArray(transfer?.files)
}

class UpupVanillaRenderer implements UpupVanillaInstance {
  readonly element: HTMLElement
  readonly core: UpupCore
  private options: Omit<UpupVanillaOptions, 'target'>
  private unsubscribers: Array<() => void> = []
  private dragging = false
  private url = ''
  private urlLoading = false
  private error = ''

  constructor({ target, ...options }: UpupVanillaOptions) {
    this.element = target
    this.options = {
      ...options,
      sources: options.sources ?? DEFAULT_SOURCES,
      theme: options.theme ?? 'light',
      locale: options.locale ?? 'en-US',
      dir: options.dir ?? 'ltr',
    }
    this.core = new UpupCore(this.toCoreOptions())
    this.bindCore()
    this.render()
  }

  addFiles(files: File[]) {
    return this.core.addFiles(files)
  }

  removeFile(id: string) {
    this.core.removeFile(id)
  }

  removeAll() {
    this.core.removeAll()
  }

  upload() {
    return this.core.upload()
  }

  update(options: Partial<Omit<UpupVanillaOptions, 'target'>>) {
    this.options = { ...this.options, ...options }
    this.core.updateOptions(this.toCoreOptions())
    this.render()
  }

  destroy() {
    for (const unsubscribe of this.unsubscribers.splice(0)) unsubscribe()
    this.core.destroy()
    this.element.replaceChildren()
  }

  private toCoreOptions(): CoreOptions {
    const { sources: _sources, enablePaste: _enablePaste, theme: _theme, locale: _locale, dir: _dir, ...coreOptions } = this.options
    return coreOptions
  }

  private bindCore() {
    const rerender = () => this.render()
    const onError = ({ error }: CoreEvents['upload-error'] | CoreEvents['error']) => {
      this.error = error.message
      this.render()
    }
    this.unsubscribers = [
      this.core.on('state-change', rerender),
      this.core.on('files-added', rerender),
      this.core.on('file-removed', rerender),
      this.core.on('files-cleared', rerender),
      this.core.on('upload-error', onError),
      this.core.on('error', onError),
    ]
  }

  private async addFetchedUrl() {
    if (!this.url || this.urlLoading) return
    this.urlLoading = true
    this.error = ''
    this.render()

    try {
      const response = await fetch(this.url)
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`)
      }
      const blob = await response.blob()
      const name = deriveFetchedFileName(this.url, response, blob)
      await this.core.addFiles([new File([blob], name, { type: blob.type })])
      this.url = ''
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error)
      this.options.onError?.(this.error)
    } finally {
      this.urlLoading = false
      this.render()
    }
  }

  private setFiles(files: File[]) {
    if (files.length) {
      this.error = ''
      void this.core.addFiles(files)
    }
  }

  private render() {
    const sources = this.options.sources ?? DEFAULT_SOURCES
    const files = [...this.core.files.values()]
    const uploadActive = this.core.status === UploadStatus.UPLOADING
    const root = document.createElement('div')
    root.className = 'upup-vanilla'
    root.dataset.theme = this.options.theme ?? 'light'
    root.dataset.state = this.core.status.toLowerCase()
    root.dataset.testid = 'upup-root'
    root.lang = this.options.locale ?? 'en-US'
    root.dir = this.options.dir ?? 'ltr'

    const panel = document.createElement('section')
    panel.className = 'upup-vanilla__panel'
    panel.dataset.testid = 'upup-container'

    const dropzone = document.createElement('div')
    dropzone.className = 'upup-vanilla__dropzone'
    dropzone.dataset.testid = 'upup-dropzone'
    dropzone.dataset.dragging = String(this.dragging)
    dropzone.setAttribute('role', 'region')
    dropzone.setAttribute('aria-label', 'Drop files here or click to browse')
    dropzone.setAttribute('aria-dropeffect', this.dragging ? 'copy' : 'none')
    dropzone.addEventListener('dragover', event => {
      event.preventDefault()
      this.dragging = true
      this.render()
    })
    dropzone.addEventListener('dragleave', () => {
      this.dragging = false
      this.render()
    })
    dropzone.addEventListener('drop', event => {
      event.preventDefault()
      this.dragging = false
      this.setFiles(eventFiles(event))
    })
    if (this.options.enablePaste) {
      dropzone.addEventListener('paste', event => {
        this.setFiles(eventFiles(event))
      })
    }

    const instructions = document.createElement('p')
    instructions.className = 'upup-vanilla__muted'
    instructions.textContent = 'Drop files here or browse from your device.'
    dropzone.append(instructions)

    if (sources.includes(FileSource.LOCAL)) {
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.accept = this.options.allowedFileTypes ?? ''
      input.dataset.testid = 'upup-file-input'
      input.addEventListener('change', () => {
        this.setFiles(fileListToArray(input.files))
        input.value = ''
      })
      dropzone.append(input)
    }

    panel.append(dropzone)

    if (sources.includes(FileSource.URL)) {
      const urlRow = document.createElement('div')
      urlRow.className = 'upup-vanilla__url'
      const input = document.createElement('input')
      input.type = 'url'
      input.placeholder = 'Enter file url'
      input.value = this.url
      input.addEventListener('input', () => {
        this.url = input.value
      })
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = this.urlLoading ? 'Fetching...' : 'Fetch'
      button.disabled = !this.url || this.urlLoading
      button.addEventListener('click', () => void this.addFetchedUrl())
      urlRow.append(input, button)
      panel.append(urlRow)
    }

    const list = document.createElement('ul')
    list.className = 'upup-vanilla__files'
    for (const file of files) {
      const item = document.createElement('li')
      item.className = 'upup-vanilla__file'
      item.dataset.testid = 'upup-file-item'

      const name = document.createElement('span')
      name.className = 'upup-vanilla__file-name'
      name.textContent = file.name

      const status = document.createElement('span')
      status.className = 'upup-vanilla__muted'
      status.textContent = file.status.toLowerCase()

      const remove = document.createElement('button')
      remove.type = 'button'
      remove.dataset.testid = 'upup-file-remove'
      remove.textContent = 'Remove'
      remove.disabled = uploadActive
      remove.addEventListener('click', () => this.core.removeFile(file.id))

      item.append(name, status, remove)
      list.append(item)
    }
    panel.append(list)

    const actions = document.createElement('div')
    actions.className = 'upup-vanilla__actions'
    const upload = document.createElement('button')
    upload.type = 'button'
    upload.className = 'upup-vanilla__primary'
    upload.textContent = files.length === 1 ? 'Upload 1 file' : `Upload ${files.length} files`
    upload.disabled = !files.length || uploadActive
    upload.addEventListener('click', () => void this.core.upload())
    const clear = document.createElement('button')
    clear.type = 'button'
    clear.textContent = 'Clear'
    clear.disabled = !files.length || uploadActive
    clear.addEventListener('click', () => this.core.removeAll())
    actions.append(upload, clear)
    panel.append(actions)

    if (this.error) {
      const error = document.createElement('p')
      error.className = 'upup-vanilla__error'
      error.dataset.testid = 'upup-error'
      error.textContent = this.error
      panel.append(error)
    }

    root.append(panel)
    this.element.replaceChildren(root)
  }
}

export function createUpupUploader(options: UpupVanillaOptions): UpupVanillaInstance {
  return new UpupVanillaRenderer(options)
}

export class UpupUploaderElement extends HTMLElement {
  private instance: UpupVanillaInstance | null = null

  static get observedAttributes() {
    return [
      'upload-endpoint',
      'server-url',
      'mode',
      'sources',
      'max-files',
      'accept',
      'enable-paste',
      'theme',
      'locale',
      'dir',
    ]
  }

  connectedCallback() {
    this.mount()
  }

  disconnectedCallback() {
    this.instance?.destroy()
    this.instance = null
  }

  attributeChangedCallback() {
    if (this.isConnected) this.mount()
  }

  private mount() {
    const options = this.readOptions()
    if (this.instance) {
      this.instance.update(options)
      return
    }
    this.instance = createUpupUploader({ target: this, ...options })
  }

  private readOptions(): Omit<UpupVanillaOptions, 'target'> {
    const maxFiles = Number(this.getAttribute('max-files'))
    return {
      uploadEndpoint: this.getAttribute('upload-endpoint') ?? undefined,
      serverUrl: this.getAttribute('server-url') ?? undefined,
      mode: (this.getAttribute('mode') as CoreOptions['mode']) ?? undefined,
      sources: parseSources(this.getAttribute('sources')),
      limit: Number.isFinite(maxFiles) && maxFiles > 0 ? maxFiles : undefined,
      allowedFileTypes: this.getAttribute('accept') ?? undefined,
      enablePaste: this.hasAttribute('enable-paste'),
      theme: (this.getAttribute('theme') as UpupVanillaTheme) ?? 'light',
      locale: this.getAttribute('locale') ?? 'en-US',
      dir: (this.getAttribute('dir') as UpupVanillaOptions['dir']) ?? 'ltr',
    }
  }
}

export function defineUpupElement(name = 'upup-uploader') {
  if (!customElements.get(name)) {
    customElements.define(name, UpupUploaderElement)
  }
  return customElements.get(name) as CustomElementConstructor
}
