import type { FileSource } from './file-source'
import type { StorageProvider } from './storage-provider'

/** Canonical source IDs accepted by the uploader. */
export type UploadSource =
    | FileSource
    | 'local'
    | 'url'
    | 'camera'
    | 'microphone'
    | 'screen'
    | 'googleDrive'
    | 'oneDrive'
    | 'dropbox'
    | 'box'

export type UploadProvider = StorageProvider | (string & {})
