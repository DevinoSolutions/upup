import type { PipelineStep, PipelineContext, UploadFile } from '../contracts'
import { cloneUploadFile, uploadFileFromImageResult } from './image-utils'
import { heicToJpegBlob } from './heic-decode'
import type { WorkerResult } from '../worker/protocol'

function jpegName(name: string): string {
    if (/\.(heic|heif)$/i.test(name))
        return name.replace(/\.(heic|heif)$/i, '.jpg')
    return `${name}.jpg`
}

export function heicStep(): PipelineStep {
    return {
        name: 'heic',
        shouldProcess: (file: UploadFile) =>
            file.type === 'image/heic' ||
            file.type === 'image/heif' ||
            /\.(heic|heif)$/i.test(file.name),
        async process(
            file: UploadFile,
            context: PipelineContext,
        ): Promise<UploadFile> {
            if (context.worker) {
                try {
                    const result = await context.worker.execute<WorkerResult>({
                        type: 'heic',
                        data: await file.arrayBuffer(),
                        params: { mime: file.type, name: file.name },
                    })
                    if (result.kind === 'image')
                        return uploadFileFromImageResult(file, result)
                } catch {
                    // upup-catch: worker execution failed — fall through to the main-thread HEIC decode path
                }
            }
            try {
                const blob = await heicToJpegBlob(file, { quality: 0.92 })
                if (!blob) return file // no canvas backend (e.g. SSR) — keep original silently
                const converted = new File([blob], jpegName(file.name), {
                    type: 'image/jpeg',
                    lastModified: file.lastModified,
                })
                return cloneUploadFile(file, converted, {
                    originalSize: file.size,
                    processedSize: converted.size,
                    heicConverted: true,
                })
            } catch (err) {
                // Surface the failure instead of silently uploading the raw HEIC.
                context.emit('pipeline-error', {
                    scope: 'heic',
                    name: file.name,
                    message: err instanceof Error ? err.message : String(err),
                })

                console.error(
                    '[upup] HEIC conversion failed for',
                    file.name,
                    err,
                )
                return file
            }
        },
    }
}
