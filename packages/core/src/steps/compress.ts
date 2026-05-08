import type { PipelineStep, PipelineContext, UploadFile } from '../contracts'

export interface ImageCompressionOptions {
  maxWidthOrHeight?: number
  maxSizeMB?: number
  quality?: number
}

export function compressStep(_options?: ImageCompressionOptions): PipelineStep {
  return {
    name: 'compress',
    shouldProcess: (file: UploadFile) => file.type.startsWith('image/'),
    async process(file: UploadFile, _context: PipelineContext): Promise<UploadFile> {
      return file
    },
  }
}
