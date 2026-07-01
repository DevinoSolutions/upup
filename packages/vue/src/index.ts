export { default as UpupUploader } from './upup-uploader.vue'
export { useUpupUpload } from './use-upup-upload'
export type {
  UseUpupUploadOptions,
  UseUpupUploadReturn,
} from './use-upup-upload'

export {
  useUploaderContext,
  useUploaderRuntime,
  useUploaderSource,
  useUploaderI18n,
  useUploaderFiles,
  useUploaderUploadControls,
  useUploaderView,
  useUploaderEditor,
  useUploaderOptions,
  useUploaderTheme,
} from './context/uploader-context'

export type {
  IUploaderContext,
  ContextRuntime,
  ContextSource,
  ContextI18n,
  ContextFiles,
  ContextUploadControls,
  ContextView,
  ContextEditor,
  ContextTheme,
  ContextProps,
  ContextUpload,
} from './context/uploader-context'

export type {
  UploaderProps,
  UploaderIcons,
} from './shared/types'

// Re-export core types consumers need
export { FileSource, StorageProvider, UploadStatus } from '@upup/core'
export type {
  UploadFile,
  CoreOptions,
  ImageEditorOptions,
  ResolvedImageEditorOptions,
  UploadSource,
  UploadProvider,
} from '@upup/core'
