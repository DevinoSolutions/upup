import type { PipelineStep, PipelineContext, UploadFile } from '../contracts'

export interface ThumbnailGeneratorOptions {
  width?: number
  height?: number
  quality?: number
}

export function thumbnailStep(_options?: ThumbnailGeneratorOptions): PipelineStep {
  return {
    name: 'thumbnail',
    shouldProcess: (file: UploadFile) =>
      file.type.startsWith('image/') || file.type.startsWith('video/'),
    async process(file: UploadFile, _context: PipelineContext): Promise<UploadFile> {
      return file
    },
  }
}
