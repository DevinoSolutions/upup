import type { PipelineStep, PipelineContext, UploadFile } from '../contracts'
import { encodeImageFile, uploadFileFromImageResult } from './image-utils'
import type { WorkerResult } from '../worker/protocol'

export function exifStep(): PipelineStep {
    return {
        name: 'exif',
        shouldProcess: (file: UploadFile) => file.type.startsWith('image/'),
        async process(
            file: UploadFile,
            context: PipelineContext,
        ): Promise<UploadFile> {
            if (context.worker) {
                try {
                    const result = await context.worker.execute<WorkerResult>({
                        type: 'exif',
                        data: await file.arrayBuffer(),
                        params: { mime: file.type, name: file.name },
                    })
                    if (result.kind === 'image')
                        return uploadFileFromImageResult(file, result)
                } catch {
                    /* fall through to main thread */
                }
            }
            const processed = await encodeImageFile(file, {
                type: file.type || 'image/jpeg',
                quality: 0.92,
                metadata: {
                    originalSize: file.size,
                    exifStripped: true,
                },
            })
            if (!processed) return file
            processed.metadata = {
                ...processed.metadata,
                processedSize: processed.size,
            }
            return processed
        },
    }
}
