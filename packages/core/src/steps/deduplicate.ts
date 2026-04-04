import {
  UpupValidationError,
  UpupErrorCode,
  type PipelineStep,
  type PipelineContext,
  type UploadFile,
} from '@upup/shared'

export function deduplicateStep(): PipelineStep {
  return {
    name: 'deduplicate',
    async process(file: UploadFile, context: PipelineContext): Promise<UploadFile> {
      for (const [id, existing] of context.files) {
        if (id !== file.id && existing.name === file.name && existing.size === file.size) {
          throw new UpupValidationError(
            `Duplicate file: "${file.name}"`,
            UpupErrorCode.DUPLICATE,
            file as unknown as File,
          )
        }
      }
      return file
    },
  }
}
