import type { PipelineStep, PipelineContext, UploadFile } from '../contracts'
import { encodeImageFile, uploadFileFromImageResult } from './image-utils'
import { isAnimatedImage } from './animated-image'
import type { WorkerResult } from '../worker/protocol'

export function exifStep(): PipelineStep {
    return {
        name: 'exif',
        shouldProcess: (file: UploadFile) => file.type.startsWith('image/'),
        async process(
            file: UploadFile,
            context: PipelineContext,
        ): Promise<UploadFile> {
            // Stripping EXIF re-encodes through a canvas, and canvas has no
            // animated encoder — an animated GIF/WebP/APNG would come back as
            // its first frame. Leave those alone; the upload is unaffected.
            //
            // The skip IS observable though: animated WebP and APNG both carry
            // EXIF, so the file reaches storage with the metadata the host asked
            // to remove (#367 item 4). Record that on the file rather than
            // emitting a new event — a privacy-sensitive host reads the marker
            // off the upload and branches server-side. Same assign-a-new-
            // metadata-object-onto-the-file shape the thumbnail step uses.
            if (await isAnimatedImage(file)) {
                file.metadata = {
                    ...file.metadata,
                    metadataStripSkipped: true,
                    metadataStripSkippedReason: 'animated-image',
                }
                return file
            }

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
                    // upup-catch: worker execution failed — fall through to the main-thread encode path
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
