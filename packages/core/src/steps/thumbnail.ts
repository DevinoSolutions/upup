import type { PipelineStep, PipelineContext, UploadFile } from '../contracts'
import { createThumbnail } from './image-utils'

export interface ThumbnailGeneratorOptions {
  width?: number
  height?: number
  quality?: number
}

export function thumbnailStep(_options?: ThumbnailGeneratorOptions): PipelineStep {
  return {
    name: 'thumbnail',
    shouldProcess: (file: UploadFile) => file.type.startsWith('image/'),
    async process(file: UploadFile, _context: PipelineContext): Promise<UploadFile> {
      if (!file.type.startsWith('image/')) return file
      const thumbnail = await createThumbnail(file, _options)
      if (!thumbnail) return file
      file.metadata = {
        ...file.metadata,
        thumbnailUrl: thumbnail.dataUrl,
      }
      file.thumbnail = { file: thumbnail.file }
      return file
    },
  }
}
