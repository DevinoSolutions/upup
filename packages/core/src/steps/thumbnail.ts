import type { PipelineStep, PipelineContext, UploadFile } from '../contracts'
import { createThumbnail } from './image-utils'
import type { WorkerResult } from '../worker/protocol'

export interface ThumbnailGeneratorOptions {
    width?: number
    height?: number
    quality?: number
}

export function thumbnailStep(
    _options?: ThumbnailGeneratorOptions,
): PipelineStep {
    return {
        name: 'thumbnail',
        shouldProcess: (file: UploadFile) => file.type.startsWith('image/'),
        async process(
            file: UploadFile,
            context: PipelineContext,
        ): Promise<UploadFile> {
            if (!file.type.startsWith('image/')) return file
            if (context.worker) {
                try {
                    const result = await context.worker.execute<WorkerResult>({
                        type: 'thumbnail',
                        data: await file.arrayBuffer(),
                        params: {
                            mime: file.type,
                            name: file.name,
                            maxWidthOrHeight: _options?.width,
                            quality: _options?.quality,
                        },
                    })
                    if (result.kind === 'thumbnail') {
                        file.metadata = {
                            ...file.metadata,
                            thumbnailUrl: result.thumbnailUrl,
                        }
                        file.thumbnail = {
                            file: new File([result.bytes], result.name, {
                                type: result.type,
                                lastModified: file.lastModified,
                            }),
                        }
                        return file
                    }
                } catch {
                    /* fall through to main thread */
                }
            }
            const thumbnail = await createThumbnail(file, _options)
            if (!thumbnail) return file
            file.metadata = {
                ...file.metadata,
                thumbnailUrl: thumbnail.dataUrl,
            }
            file.thumbnail = { file: thumbnail.file }
            return file
        },
    }
}
