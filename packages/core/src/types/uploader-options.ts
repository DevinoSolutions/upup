import type { FileSource } from './file-source'
import type { StorageProvider } from './storage-provider'

/**
 * String-literal accept-set for the public props: everywhere a prop takes a
 * source id, plain strings ('local', 'googleDrive', …) must typecheck without
 * importing the FileSource enum. Deliberately kept ALONGSIDE FileSource — not
 * an accidental alias (F-726 ruling); the accept-set is pinned by
 * src/__tests__/types/upload-source.test.ts.
 */
export type UploadSource = `${FileSource}`

export type UploadProvider = StorageProvider | (string & {})
