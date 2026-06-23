import type { PipelineStep } from '../contracts-pipeline'
import type { CoreOptions } from '../core'

/**
 * Assembles the auto-pipeline from boolean option flags, lazily importing each
 * step so unused steps stay out of the bundle. Order is fixed:
 * heic → exif → compress → thumbnail → hash.
 */
export async function buildAutoPipeline(options: CoreOptions): Promise<PipelineStep[]> {
  const steps: PipelineStep[] = []

  if (options.heicConversion) {
    const { heicStep } = await import('../steps/heic')
    steps.push(heicStep())
  }

  if (options.stripExifData) {
    const { exifStep } = await import('../steps/exif')
    steps.push(exifStep())
  }

  if (options.imageCompression) {
    const { compressStep } = await import('../steps/compress')
    const opts = typeof options.imageCompression === 'object'
      ? options.imageCompression
      : {}
    steps.push(compressStep(opts))
  }

  if (options.thumbnailGenerator) {
    const { thumbnailStep } = await import('../steps/thumbnail')
    const opts = typeof options.thumbnailGenerator === 'object'
      ? options.thumbnailGenerator
      : {}
    steps.push(thumbnailStep(opts))
  }

  if (options.checksumVerification) {
    const { hashStep } = await import('../steps/hash')
    steps.push(hashStep())
  }

  return steps
}
