import type { UploadFile } from './upload-file'
import type { UpupError } from '../errors'

export type FileUploadResult = {
  file: UploadFile
  url: string
  status: 'success' | 'failed' | 'skipped'
  error?: UpupError
}
