export { createUploader } from './create-uploader'
export type {
    UpupInstance,
    CreateUploaderOptions,
    UploaderSnapshot,
    UploaderContext,
} from './lib/types'
// re-export the same core types svelte re-exports
export { FileSource, StorageProvider, UploadStatus } from '@upupjs/core'
export type {
    UploadFile,
    CoreOptions,
    ImageEditorOptions,
    ResolvedImageEditorOptions,
    UploadSource,
    UploadProvider,
} from '@upupjs/core'
