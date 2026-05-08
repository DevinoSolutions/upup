import type { PipelineStep, PipelineContext, UploadFile } from '../contracts'
import { encodeImageFile } from './image-utils'

export function exifStep(): PipelineStep {
  return {
    name: 'exif',
    shouldProcess: (file: UploadFile) => file.type.startsWith('image/'),
    async process(file: UploadFile, _context: PipelineContext): Promise<UploadFile> {
      const processed = await encodeImageFile(file, {
        type: file.type || 'image/jpeg',
        quality: 0.92,
        metadata: {
          originalSize: file.size,
          exifStripped: true,
        },
      })
      if (!processed) return file
      processed.metadata = {
        ...processed.metadata,
        processedSize: processed.size,
      }
      return processed
    },
  }
}
