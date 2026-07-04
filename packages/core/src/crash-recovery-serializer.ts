import { FileSource } from './types/file-source'
import type { UploadFile } from './types/upload-file'
import { UploadStatus } from './types/upload-status'

export type CrashRecoveryFileSnapshot = {
  file: File
  id: string
  name: string
  type: string
  lastModified?: number
  source: UploadFile['source']
  status: UploadStatus
  metadata: UploadFile['metadata']
  url?: string
  relativePath?: string
  key?: string
  etag?: string
  fileHash?: string
  checksumSHA256?: string
  thumbnail?: UploadFile['thumbnail']
}

export type CoreCrashRecoverySnapshot = {
  files: [string, CrashRecoveryFileSnapshot | UploadFile][]
  status: UploadStatus
}

function toCrashRecoveryFileSnapshot(id: string, file: UploadFile): CrashRecoveryFileSnapshot {
  const snapshot: CrashRecoveryFileSnapshot = {
    file,
    id: file.id ?? id,
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
    source: file.source ?? FileSource.LOCAL,
    status: file.status ?? UploadStatus.IDLE,
    metadata: file.metadata ?? {},
  }

  if (file.url && !file.url.startsWith('blob:')) {
    snapshot.url = file.url
  }

  for (const key of ['relativePath', 'key', 'etag', 'fileHash', 'checksumSHA256'] as const) {
    if (file[key] !== undefined) {
      Object.assign(snapshot, { [key]: file[key] })
    }
  }
  if (file.thumbnail) {
    snapshot.thumbnail = file.thumbnail
  }

  return snapshot
}

export function serializeCrashRecovery(
  files: ReadonlyMap<string, UploadFile>,
  status: UploadStatus,
): CoreCrashRecoverySnapshot {
  return {
    files: [...files.entries()].map(([id, file]) => [id, toCrashRecoveryFileSnapshot(id, file)]),
    status,
  }
}

export function reviveCrashRecoverySnapshot(
  snapshot: unknown,
): { files: [string, UploadFile][]; status: UploadStatus } | null {
  if (!isRecord(snapshot) || !Array.isArray(snapshot.files)) {
    return null
  }

  const status = isUploadStatus(snapshot.status) ? snapshot.status : UploadStatus.IDLE
  const files = snapshot.files
    .map((entry, index): [string, UploadFile] | null => {
      if (!Array.isArray(entry) || entry.length < 2) return null
      const id = typeof entry[0] === 'string' ? entry[0] : `recovered-${index}`
      const file = reviveCrashRecoveryFile(id, entry[1], status)
      return file ? [id, file] : null
    })
    .filter((entry): entry is [string, UploadFile] => entry != null)

  return { files, status }
}

function reviveCrashRecoveryFile(id: string, value: unknown, fallbackStatus: UploadStatus): UploadFile | null {
  const isFileLike = typeof File !== 'undefined' && value instanceof File
  const wrappedBlob = isRecord(value) && typeof Blob !== 'undefined' && value.file instanceof Blob
    ? value.file
    : null
  const props = isRecord(value) && wrappedBlob ? value : isRecord(value) ? value : {}
  const nameFromProps = typeof props.name === 'string' && props.name.trim() !== ''
    ? props.name
    : undefined
  const file = wrappedBlob
    ? toRecoverableFile(wrappedBlob, nameFromProps ?? id, props)
    : isFileLike
      ? value as File
      : null
  if (!file) return null

  const metadata = isRecord(props.metadata)
    ? props.metadata as UploadFile['metadata']
    : {}
  const uploadStatus = isUploadStatus(props.status) ? props.status : fallbackStatus
  const source = Object.values(FileSource).includes(props.source as FileSource)
    ? props.source as FileSource
    : FileSource.LOCAL
  const uploadFile = Object.assign(file, {
    id: typeof props.id === 'string' ? props.id : id,
    source,
    status: uploadStatus,
    metadata,
  }) as UploadFile
  const url = typeof props.url === 'string' && !props.url.startsWith('blob:')
    ? props.url
    : createObjectUrl(file)
  if (url) {
    uploadFile.url = url
  }

  for (const key of ['relativePath', 'key', 'etag', 'fileHash', 'checksumSHA256'] as const) {
    if (typeof props[key] === 'string') {
      Object.assign(uploadFile, { [key]: props[key] })
    }
  }
  if (isRecord(props.thumbnail)) {
    uploadFile.thumbnail = props.thumbnail as UploadFile['thumbnail']
  }

  return uploadFile
}

function createObjectUrl(file: File): string | undefined {
  return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
    ? URL.createObjectURL(file)
    : undefined
}

function toRecoverableFile(blob: Blob, name: string, props: Record<string, unknown>): File | null {
  if (typeof File === 'undefined') return null
  if (blob instanceof File && blob.name) {
    return blob
  }
  const type = typeof props.type === 'string' ? props.type : blob.type
  const lastModified = typeof props.lastModified === 'number' ? props.lastModified : Date.now()
  return new File([blob], name, { type, lastModified })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isUploadStatus(value: unknown): value is UploadStatus {
  return Object.values(UploadStatus).includes(value as UploadStatus)
}
