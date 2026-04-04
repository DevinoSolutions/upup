import type { UploadFile } from './types/upload-file'

export interface PipelineStep {
  name: string
  process(file: UploadFile, context: PipelineContext): Promise<UploadFile>
  shouldProcess?(file: UploadFile): boolean
}

export interface PipelineContext {
  files: ReadonlyMap<string, UploadFile>
  options: Record<string, unknown>
  emit(event: string, data?: unknown): void
  t: (key: string, vars?: Record<string, unknown>) => string
  worker?: {
    execute<T>(task: { type: string; data: ArrayBuffer }): Promise<T>
  }
}
