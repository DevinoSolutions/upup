import type { PipelineStep, PipelineContext, UploadFile } from '../contracts'

export function gzipStep(): PipelineStep {
  return {
    name: 'gzip',
    async process(file: UploadFile, _context: PipelineContext): Promise<UploadFile> {
      return file
    },
  }
}
