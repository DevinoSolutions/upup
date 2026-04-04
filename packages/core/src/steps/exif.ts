import type { PipelineStep, PipelineContext, UploadFile } from '@upup/shared'

export function exifStep(): PipelineStep {
  return {
    name: 'exif',
    shouldProcess: (file: UploadFile) => file.type.startsWith('image/'),
    async process(file: UploadFile, _context: PipelineContext): Promise<UploadFile> {
      if (typeof OffscreenCanvas === 'undefined' && typeof document === 'undefined') {
        return file
      }
      return file
    },
  }
}
