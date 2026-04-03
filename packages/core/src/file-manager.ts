import {
  UpupValidationError,
  UpupErrorCode,
  FileSource,
  UploadStatus,
  type UploadFile,
  type MaxFileSizeObject,
} from '@upup/shared'

export interface FileManagerOptions {
  accept?: string
  limit?: number
  minFiles?: number
  maxFileSize?: MaxFileSizeObject
  minFileSize?: MaxFileSizeObject
  maxTotalFileSize?: MaxFileSizeObject
  contentDeduplication?: boolean
  onBeforeFileAdded?: (file: File) => boolean | File | undefined | Promise<boolean | File | undefined>
}

let fileIdCounter = 0

function generateFileId(): string {
  return `upup-${Date.now()}-${++fileIdCounter}`
}

export function fileSizeInBytes(size: MaxFileSizeObject): number {
  const units: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 }
  return size.size * (units[size.unit] ?? 1)
}

export function matchesAccept(file: File, accept: string): boolean {
  const types = accept.split(',').map(t => t.trim())
  return types.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.replace('/*', '/'))
    }
    if (type.startsWith('.')) {
      return file.name.toLowerCase().endsWith(type.toLowerCase())
    }
    return file.type === type
  })
}

function nativeToUploadFile(file: File, source: FileSource = FileSource.LOCAL): UploadFile {
  return Object.assign(file, {
    id: generateFileId(),
    source,
    status: UploadStatus.IDLE,
    metadata: {},
    url: undefined,
    relativePath: undefined,
    key: undefined,
    etag: undefined,
    fileHash: undefined,
    checksumSHA256: undefined,
    thumbnail: undefined,
  }) as UploadFile
}

export class FileManager {
  private files = new Map<string, UploadFile>()
  private options: FileManagerOptions

  constructor(options: FileManagerOptions) {
    this.options = options
  }

  getFiles(): Map<string, UploadFile> {
    return this.files
  }

  async addFiles(nativeFiles: File[]): Promise<UploadFile[]> {
    const accepted: UploadFile[] = []

    for (const nativeFile of nativeFiles) {
      if (this.options.onBeforeFileAdded) {
        const result = await this.options.onBeforeFileAdded(nativeFile)
        if (result === false) continue
        if (result instanceof File) {
          accepted.push(nativeToUploadFile(result))
          continue
        }
      }

      if (this.options.accept && !matchesAccept(nativeFile, this.options.accept)) {
        throw new UpupValidationError(
          `File type "${nativeFile.type}" is not accepted`,
          UpupErrorCode.TYPE_MISMATCH,
          nativeFile,
        )
      }

      if (this.options.maxFileSize) {
        const maxBytes = fileSizeInBytes(this.options.maxFileSize)
        if (nativeFile.size > maxBytes) {
          throw new UpupValidationError(
            `File "${nativeFile.name}" exceeds maximum size`,
            UpupErrorCode.FILE_TOO_LARGE,
            nativeFile,
          )
        }
      }

      if (this.options.minFileSize) {
        const minBytes = fileSizeInBytes(this.options.minFileSize)
        if (nativeFile.size < minBytes) {
          throw new UpupValidationError(
            `File "${nativeFile.name}" is below minimum size`,
            UpupErrorCode.FILE_TOO_SMALL,
            nativeFile,
          )
        }
      }

      accepted.push(nativeToUploadFile(nativeFile))
    }

    if (this.options.limit) {
      const totalAfter = this.files.size + accepted.length
      if (totalAfter > this.options.limit) {
        throw new UpupValidationError(
          `Adding ${accepted.length} files would exceed the limit of ${this.options.limit}`,
          UpupErrorCode.LIMIT_EXCEEDED,
          nativeFiles[0],
        )
      }
    }

    if (this.options.maxTotalFileSize) {
      const maxTotal = fileSizeInBytes(this.options.maxTotalFileSize)
      const currentTotal = [...this.files.values()].reduce((sum, f) => sum + f.size, 0)
      const newTotal = accepted.reduce((sum, f) => sum + f.size, 0)
      if (currentTotal + newTotal > maxTotal) {
        throw new UpupValidationError(
          'Total file size exceeds maximum',
          UpupErrorCode.TOTAL_SIZE_EXCEEDED,
          nativeFiles[0],
        )
      }
    }

    for (const file of accepted) {
      this.files.set(file.id, file)
    }

    return accepted
  }

  removeFile(id: string): UploadFile | undefined {
    const file = this.files.get(id)
    this.files.delete(id)
    return file
  }

  removeAll(): void {
    this.files.clear()
  }

  async setFiles(nativeFiles: File[]): Promise<UploadFile[]> {
    this.files.clear()
    return this.addFiles(nativeFiles)
  }

  reorderFiles(fromIndex: number, toIndex: number): void {
    const entries = [...this.files.entries()]
    const [moved] = entries.splice(fromIndex, 1)
    entries.splice(toIndex, 0, moved)
    this.files = new Map(entries)
  }
}
