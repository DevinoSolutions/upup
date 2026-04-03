import type { PipelineStep, PipelineContext, UploadFile } from '@upup/shared'

async function computeSHA256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function hashStep(): PipelineStep {
  return {
    name: 'hash',
    async process(file: UploadFile, _context: PipelineContext): Promise<UploadFile> {
      const buffer = await file.arrayBuffer()
      const hash = await computeSHA256(buffer)
      file.metadata = { ...file.metadata, checksum: hash, originalContentHash: hash }
      return Object.assign(file, { checksumSHA256: hash })
    },
  }
}
