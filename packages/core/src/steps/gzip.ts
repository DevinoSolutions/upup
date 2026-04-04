import type { PipelineStep, PipelineContext, UploadFile } from '@upup/shared'

export function gzipStep(): PipelineStep {
  return {
    name: 'gzip',
    async process(file: UploadFile, _context: PipelineContext): Promise<UploadFile> {
      return file
    },
  }
}
