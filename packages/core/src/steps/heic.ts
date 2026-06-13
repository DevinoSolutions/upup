import type { PipelineStep, PipelineContext, UploadFile } from '../contracts'
import { cloneUploadFile, uploadFileFromImageResult } from './image-utils'
import type { WorkerResult } from '../worker/protocol'

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
    async process(file: UploadFile, context: PipelineContext): Promise<UploadFile> {
      if (context.worker) {
        try {
          const result = await context.worker.execute<WorkerResult>({
            type: 'heic',
            data: await file.arrayBuffer(),
            params: { mime: file.type, name: file.name },
          })
          if (result.kind === 'image') return uploadFileFromImageResult(file, result)
        } catch { /* fall through to main thread */ }
      }
      try {
        const mod = await import('heic2any')
        const convert = mod.default
        const heic2anyResult = await convert({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.92,
        })
        const blob = Array.isArray(heic2anyResult) ? heic2anyResult[0] : heic2anyResult
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
