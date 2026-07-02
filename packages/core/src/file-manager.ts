import {
  UpupValidationError,
  UpupErrorCode,
  FileSource,
  UploadStatus,
  type UploadFile,
  type MaxFileSizeObject,
} from './contracts'
import { fileSizeInBytes, matchesAccept, validateFileRestrictions } from './validate-file-restrictions'

// Re-exported for backwards compatibility — relocated to validate-file-restrictions.ts
export { fileSizeInBytes, matchesAccept }

export interface FileManagerOptions {
  allowedFileTypes?: string
  limit?: number
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

async function computeContentHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  let hash = 0x811c9dc5
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193)
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function storedContentHash(file: UploadFile): string | undefined {
  const metadata = file.metadata as Record<string, unknown> | undefined
  return (
    (typeof metadata?.originalContentHash === 'string' ? metadata.originalContentHash : undefined) ??
    (typeof metadata?.checksum === 'string' ? metadata.checksum : undefined) ??
    file.checksumSHA256 ??
    file.fileHash ??
    undefined
  )
}

function applyContentHash(file: UploadFile, hash: string): UploadFile {
  file.fileHash = hash
  file.metadata = {
    ...file.metadata,
    originalContentHash: hash,
  }
  return file
}

function nativeToUploadFile(file: File, source: FileSource = FileSource.LOCAL): UploadFile {
  const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
    ? URL.createObjectURL(file)
    : undefined
  const extendedFile = file as File & {
    relativePath?: string
    webkitRelativePath?: string
    metadata?: Record<string, unknown>
  }
  const relativePath =
    typeof extendedFile.relativePath === 'string' &&
    extendedFile.relativePath.trim() !== ''
      ? extendedFile.relativePath
      : typeof extendedFile.webkitRelativePath === 'string' &&
          extendedFile.webkitRelativePath.trim() !== ''
        ? extendedFile.webkitRelativePath
        : undefined
  const existingMetadata =
    extendedFile.metadata &&
    typeof extendedFile.metadata === 'object' &&
    !Array.isArray(extendedFile.metadata)
      ? extendedFile.metadata
      : {}

  const uploadFile = Object.assign(file, {
    id: generateFileId(),
    source,
    status: UploadStatus.IDLE,
    metadata: {
      ...existingMetadata,
      ...(relativePath ? { relativePath } : {}),
    },
    url,
    key: undefined,
    etag: undefined,
    fileHash: undefined,
    checksumSHA256: undefined,
    thumbnail: undefined,
  }) as UploadFile

  if (relativePath) {
    try {
      Object.defineProperty(uploadFile, 'relativePath', {
        value: relativePath,
        configurable: true,
        enumerable: false,
        writable: true,
      })
    } catch {
      try {
        uploadFile.relativePath = relativePath
      } catch {
        // Some File-like objects expose read-only path metadata. Preserve it
        // through metadata and avoid failing file admission.
      }
    }
  }

  return uploadFile
}

function revokeObjectUrl(file?: UploadFile): void {
  if (
    file?.url &&
    file.url.startsWith('blob:') &&
    typeof URL !== 'undefined' &&
    typeof URL.revokeObjectURL === 'function'
  ) {
    URL.revokeObjectURL(file.url)
  }
}

export class FileManager {
  private files = new Map<string, UploadFile>()
  private options: FileManagerOptions

  constructor(options: FileManagerOptions) {
    this.options = options
  }

  updateOptions(options: Partial<FileManagerOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    }
  }

  getFiles(): Map<string, UploadFile> {
    return this.files
  }

  private validateFile(file: File): void {
    const [violation] = validateFileRestrictions(file, this.options)
    if (violation) {
      throw new UpupValidationError(violation.message, violation.code, file)
    }
  }

  private async collectAcceptedFiles(nativeFiles: File[]): Promise<File[]> {
    const accepted: File[] = []
    for (const nativeFile of nativeFiles) {
      let candidate = nativeFile
      if (this.options.onBeforeFileAdded) {
        const result = await this.options.onBeforeFileAdded(nativeFile)
        if (result === false) continue
        if (result instanceof File) {
          candidate = result
        }
      }

      this.validateFile(candidate)
      accepted.push(candidate)
    }
    return accepted
  }

  private async deduplicateByContent(
    nativeFiles: File[],
    existingFiles: Iterable<UploadFile>,
  ): Promise<Array<{ file: File; hash?: string }>> {
    if (!this.options.contentDeduplication) {
      return nativeFiles.map(file => ({ file }))
    }

    const seen = new Set<string>()
    for (const existing of existingFiles) {
      const nativeExisting = existing as unknown as File
      const hash = storedContentHash(existing) ?? (
        typeof nativeExisting.arrayBuffer === 'function'
          ? await computeContentHash(nativeExisting)
          : undefined
      )
      if (hash) {
        applyContentHash(existing, hash)
        seen.add(hash)
      }
    }

    const accepted: Array<{ file: File; hash: string }> = []
    for (const file of nativeFiles) {
      const hash = await computeContentHash(file)
      if (seen.has(hash)) continue
      seen.add(hash)
      accepted.push({ file, hash })
    }

    return accepted
  }

  private assertBatchFits(files: File[], existingFiles: Iterable<UploadFile>, fallbackFile?: File): void {
    if (files.length === 0) return

    const existing = [...existingFiles]
    if (this.options.limit) {
      const remainingSlots = this.options.limit - existing.length
      if (remainingSlots <= 0 || files.length > remainingSlots) {
        throw new UpupValidationError(
          `Adding ${files.length} files would exceed the limit of ${this.options.limit}`,
          UpupErrorCode.LIMIT_EXCEEDED,
          files[0] ?? fallbackFile!,
        )
      }
    }

    if (this.options.maxTotalFileSize) {
      const maxTotal = fileSizeInBytes(this.options.maxTotalFileSize)
      const currentTotal = existing.reduce((sum, f) => sum + f.size, 0)
      const newTotal = files.reduce((sum, f) => sum + f.size, 0)
      if (currentTotal + newTotal > maxTotal) {
        throw new UpupValidationError(
          'Total file size exceeds maximum',
          UpupErrorCode.TOTAL_SIZE_EXCEEDED,
          files[0] ?? fallbackFile!,
        )
      }
    }
  }

  async addFiles(nativeFiles: File[]): Promise<UploadFile[]> {
    const acceptedNativeFiles = await this.collectAcceptedFiles(nativeFiles)
    const dedupedFiles = await this.deduplicateByContent(acceptedNativeFiles, this.files.values())
    this.assertBatchFits(dedupedFiles.map(item => item.file), this.files.values(), nativeFiles[0])
    const accepted = dedupedFiles.map(({ file, hash }) => {
      const uploadFile = nativeToUploadFile(file)
      return hash ? applyContentHash(uploadFile, hash) : uploadFile
    })

    for (const file of accepted) {
      this.files.set(file.id, file)
    }

    return accepted
  }

  removeFile(id: string): UploadFile | undefined {
    const file = this.files.get(id)
    if (file) {
      revokeObjectUrl(file)
      this.files.delete(id)
    }
    return file
  }

  replaceFile(id: string, file: File | UploadFile): UploadFile {
    const current = this.files.get(id)
    if (!current) {
      throw new Error(`replaceFile: unknown file ID "${id}"`)
    }
    const next = 'metadata' in file && 'source' in file && 'status' in file
      ? Object.assign(file, { id }) as UploadFile
      : Object.assign(nativeToUploadFile(file as File, current.source), { id }) as UploadFile
    if (current.url !== next.url) {
      revokeObjectUrl(current)
    }
    this.files.set(id, next)
    return next
  }

  removeAll(): void {
    for (const file of this.files.values()) {
      revokeObjectUrl(file)
    }
    this.files.clear()
  }

  async setFiles(nativeFiles: File[]): Promise<UploadFile[]> {
    const acceptedNativeFiles = await this.collectAcceptedFiles(nativeFiles)
    const dedupedFiles = await this.deduplicateByContent(acceptedNativeFiles, [])
    this.assertBatchFits(dedupedFiles.map(item => item.file), [], nativeFiles[0])
    const accepted = dedupedFiles.map(({ file, hash }) => {
      const uploadFile = nativeToUploadFile(file)
      return hash ? applyContentHash(uploadFile, hash) : uploadFile
    })
    for (const file of this.files.values()) {
      revokeObjectUrl(file)
    }
    this.files.clear()
    for (const file of accepted) {
      this.files.set(file.id, file)
    }
    return accepted
  }

  reorderFiles(fileIds: string[]): void {
    if (fileIds.length !== this.files.size) {
      throw new Error(
        `reorderFiles: expected ${this.files.size} IDs but received ${fileIds.length}`,
      )
    }

    const newMap = new Map<string, UploadFile>()
    for (const id of fileIds) {
      const file = this.files.get(id)
      if (!file) {
        throw new Error(`reorderFiles: unknown file ID "${id}"`)
      }
      newMap.set(id, file)
    }
    this.files = newMap
  }
}
