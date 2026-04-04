export enum FileSource {
  LOCAL = 'LOCAL',
  GOOGLE_DRIVE = 'GOOGLE_DRIVE',
  ONE_DRIVE = 'ONE_DRIVE',
  DROPBOX = 'DROPBOX',
  URL = 'URL',
  CAMERA = 'CAMERA',
  MICROPHONE = 'MICROPHONE',
  SCREEN = 'SCREEN',
}

/** @deprecated Use FileSource instead */
export const UploadAdapter = {
  INTERNAL: FileSource.LOCAL,
  GOOGLE_DRIVE: FileSource.GOOGLE_DRIVE,
  ONE_DRIVE: FileSource.ONE_DRIVE,
  DROPBOX: FileSource.DROPBOX,
  LINK: FileSource.URL,
  CAMERA: FileSource.CAMERA,
} as const

/** @deprecated Use FileSource instead */
export type UploadAdapter = (typeof UploadAdapter)[keyof typeof UploadAdapter]
