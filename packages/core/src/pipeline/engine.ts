import type { PipelineStep, PipelineContext, UploadFile } from '@upup/shared'

export class PipelineEngine {
  constructor(private steps: PipelineStep[]) {}

  async process(file: UploadFile, context: PipelineContext): Promise<UploadFile> {
    context.emit('pipeline-start', { fileId: file.id, steps: this.steps.map(s => s.name) })

    let current = file

    for (const step of this.steps) {
      if (step.shouldProcess && !step.shouldProcess(current)) {
        continue
      }

      current = await step.process(current, context)

      context.emit('pipeline-step', {
        fileId: file.id,
        step: step.name,
      })
    }

    context.emit('pipeline-complete', { fileId: file.id })
    return current
  }

  async processAll(files: UploadFile[], context: PipelineContext): Promise<UploadFile[]> {
    const results: UploadFile[] = []
    for (const file of files) {
      results.push(await this.process(file, context))
    }
    return results
  }
}
