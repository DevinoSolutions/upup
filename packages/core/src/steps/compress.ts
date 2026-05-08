import type { PipelineStep, PipelineContext, UploadFile } from '../contracts'
import { encodeImageFile } from './image-utils'

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
      const maxBytes = typeof _options?.maxSizeMB === 'number'
        ? _options.maxSizeMB * 1024 * 1024
        : undefined
      let quality = _options?.quality ?? 0.82
      let processed = await encodeImageFile(file, {
        maxWidthOrHeight: _options?.maxWidthOrHeight ?? 1920,
        quality,
        metadata: {
          originalSize: file.size,
          compressed: true,
        },
      })

      while (processed && maxBytes && processed.size > maxBytes && quality > 0.35) {
        quality = Math.max(0.35, quality - 0.12)
        processed = await encodeImageFile(file, {
          maxWidthOrHeight: _options?.maxWidthOrHeight ?? 1920,
          quality,
          metadata: {
            originalSize: file.size,
            compressed: true,
          },
        })
      }

      if (!processed) return file
      if (processed.size >= file.size && !maxBytes && !_options?.maxWidthOrHeight) {
        return file
      }

      processed.metadata = {
        ...processed.metadata,
        processedSize: processed.size,
      }
      return processed
    },
  }
}
