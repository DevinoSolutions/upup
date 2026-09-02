// packages/server/src/storage.ts
//
// The one home for "is this storage config something @upupjs/server can serve?".
// createUpupHandler asserts it at construct time and getDownloadUrl asserts it
// per call, so the check and its wording live here rather than being duplicated
// (and drifting) at each entry point.

import { UpupConfigError, NON_S3_STORAGE_PROVIDERS } from '@upupjs/core'
import type { UpupStorageConfig } from './config'

/**
 * Reject a provider with no S3-compatible API (F-657). The S3 upload path
 * (buildS3ClientConfig) always builds an @aws-sdk/client-s3 client, so such a
 * provider could never function — fail loudly instead of 500ing at request time.
 */
export function assertS3Storage(storage: UpupStorageConfig): void {
    const storageType = storage.type
    if (
        typeof storageType === 'string' &&
        (NON_S3_STORAGE_PROVIDERS as ReadonlySet<string>).has(storageType)
    ) {
        throw new UpupConfigError(
            `[@upupjs/server] storage.type "${storageType}" has no S3-compatible API and cannot be served. ` +
                'upup uploads via the S3 API — use an S3-compatible provider ' +
                '(aws, minio, r2, wasabi, …) and set storage.endpoint for non-AWS backends.',
        )
    }
}
