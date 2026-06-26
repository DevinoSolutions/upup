import type { FileSource } from './file-source'
import type { StorageProvider } from './storage-provider'

/** Canonical source IDs accepted by the uploader — derived from FileSource enum values. */
export type UploadSource = `${FileSource}`

export type UploadProvider = StorageProvider | (string & {})
