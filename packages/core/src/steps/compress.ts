import type { PipelineStep, PipelineContext, UploadFile } from '../contracts'
import { encodeImageFile, uploadFileFromImageResult } from './image-utils'
import type { WorkerResult } from '../worker/protocol'

export interface ImageCompressionOptions {
  maxWidthOrHeight?: number
  maxSizeMB?: number
  quality?: number
}

export function compressStep(_options?: ImageCompressionOptions): PipelineStep {
  return {
    name: 'compress',
    shouldProcess: (file: UploadFile) => file.type.startsWith('image/'),
    async process(file: UploadFile, context: PipelineContext): Promise<UploadFile> {
      if (context.worker) {
        try {
          const result = await context.worker.execute<WorkerResult>({
            type: 'compress',
            data: await file.arrayBuffer(),
            params: {
              mime: file.type,
              name: file.name,
              maxWidthOrHeight: _options?.maxWidthOrHeight,
              maxSizeMB: _options?.maxSizeMB,
              quality: _options?.quality,
            },
          })
          if (result.kind === 'image') return uploadFileFromImageResult(file, result)
        } catch { /* fall through to main thread */ }
      }

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
