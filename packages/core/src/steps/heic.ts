import type { PipelineStep, PipelineContext, UploadFile } from '../contracts'
import { cloneUploadFile } from './image-utils'

function jpegName(name: string): string {
  if (/\.(heic|heif)$/i.test(name)) return name.replace(/\.(heic|heif)$/i, '.jpg')
  return `${name}.jpg`
}

export function heicStep(): PipelineStep {
  return {
    name: 'heic',
    shouldProcess: (file: UploadFile) =>
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      /\.(heic|heif)$/i.test(file.name),
    async process(file: UploadFile, _context: PipelineContext): Promise<UploadFile> {
      try {
        const mod = await import('heic2any')
        const convert = mod.default
        const result = await convert({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.92,
        })
        const blob = Array.isArray(result) ? result[0] : result
        if (!(blob instanceof Blob)) return file
        const converted = new File([blob], jpegName(file.name), {
          type: 'image/jpeg',
          lastModified: file.lastModified,
        })
        return cloneUploadFile(file, converted, {
          originalSize: file.size,
          processedSize: converted.size,
          heicConverted: true,
        })
      } catch {
        return file
      }
    },
  }
}
