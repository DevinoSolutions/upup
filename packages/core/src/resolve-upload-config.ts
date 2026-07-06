import { UpupConfigError } from './errors'
import type { CoreOptions } from './core'
import type { UploadManagerOptions } from './upload-manager'
import { TokenEndpointCredentials } from './strategies/token-endpoint'
import { ServerCredentials } from './strategies/server-credentials'
import { DirectUpload } from './strategies/direct-upload'
import { MultipartUpload } from './strategies/multipart-upload'
import { TusUpload } from './strategies/tus-upload'

export type ResolvedUploadConfig = Pick<
    UploadManagerOptions,
    | 'credentials'
    | 'uploadStrategy'
    | 'resolveUploadStrategy'
    | 'maxConcurrentUploads'
    | 'maxRetries'
    | 'fastAbortThreshold'
    | 'isSuccessfulCall'
>

/**
 * Pure selection of credentials + upload strategy from options. No state, no
 * side effects beyond constructing strategy instances. The state-touching
 * UploadManager callbacks are supplied separately by UpupCore.
 */
export function resolveUploadConfig(
    options: CoreOptions,
): ResolvedUploadConfig {
    const tusOptions =
        options.resumable?.protocol === 'tus' ? options.resumable : null
    const configuredTargetCount = [
        options.uploadEndpoint,
        options.serverUrl,
        tusOptions?.endpoint,
    ].filter(Boolean).length

    if (configuredTargetCount > 1) {
        throw new UpupConfigError(
            'Configure exactly one upload target: uploadEndpoint, serverUrl, or resumable.protocol="tus" with endpoint.',
            'AMBIGUOUS_UPLOAD_TARGET',
        )
    }

    const credentials = options.serverUrl
        ? new ServerCredentials({
              serverUrl: options.serverUrl,
          })
        : options.uploadEndpoint
          ? new TokenEndpointCredentials({
                url: options.uploadEndpoint,
            })
          : {
                getPresignedUrl: async () => {
                    throw new UpupConfigError(
                        'Tus uploads do not use presigned upload URLs.',
                    )
                },
            }
    const directUpload = new DirectUpload()
    const tusUpload = tusOptions ? new TusUpload(tusOptions) : null
    const multipartUpload =
        options.resumable?.protocol === 'multipart'
            ? new MultipartUpload({
                  credentials,
                  chunkSizeBytes: options.resumable.chunkSizeBytes,
              })
            : null
    const multipartThreshold =
        options.resumable?.protocol === 'multipart'
            ? (options.resumable.thresholdBytes ?? 5 * 1024 * 1024)
            : Number.POSITIVE_INFINITY

    return {
        credentials,
        uploadStrategy: directUpload,
        resolveUploadStrategy: file => {
            if (tusUpload) {
                return { uploadStrategy: tusUpload, presign: false }
            }
            const shouldUseMultipart = Boolean(
                multipartUpload && file.size >= multipartThreshold,
            )
            return shouldUseMultipart
                ? { uploadStrategy: multipartUpload!, presign: false }
                : { uploadStrategy: directUpload, presign: true }
        },
        maxConcurrentUploads: options.maxConcurrentUploads ?? 3,
        ...(options.maxRetries !== undefined
            ? { maxRetries: options.maxRetries }
            : {}),
        ...(options.fastAbortThreshold !== undefined
            ? { fastAbortThreshold: options.fastAbortThreshold }
            : {}),
        ...(options.isSuccessfulCall !== undefined
            ? { isSuccessfulCall: options.isSuccessfulCall }
            : {}),
    }
}
