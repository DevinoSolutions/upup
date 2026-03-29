import type { PipelineStep, PipelineContext, UploadFile } from '@upup/shared'

export function heicStep(): PipelineStep {
  return {
    name: 'heic',
    shouldProcess: (file: UploadFile) =>
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      file.name.toLowerCase().endsWith('.heic'),
    async process(file: UploadFile, _context: PipelineContext): Promise<UploadFile> {
      return file
    },
  }
}
