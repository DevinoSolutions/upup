import type { PipelineStep, PipelineContext, UploadFile } from '../contracts'
import type { WorkerResult } from '../worker/protocol'

async function computeSHA256(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function hashStep(): PipelineStep {
    return {
        name: 'hash',
        async process(
            file: UploadFile,
            context: PipelineContext,
        ): Promise<UploadFile> {
            if (context.worker) {
                try {
                    const result = await context.worker.execute<WorkerResult>({
                        type: 'hash',
                        data: await file.arrayBuffer(),
                    })
                    if (result.kind === 'hash') {
                        file.metadata = {
                            ...file.metadata,
                            checksum: result.checksum,
                            originalContentHash: result.checksum,
                        }
                        return Object.assign(file, {
                            checksumSHA256: result.checksum,
                        })
                    }
                } catch {
                    /* fall through to main thread */
                }
            }
            const buffer = await file.arrayBuffer()
            const hash = await computeSHA256(buffer)
            file.metadata = {
                ...file.metadata,
                checksum: hash,
                originalContentHash: hash,
            }
            return Object.assign(file, { checksumSHA256: hash })
        },
    }
}
