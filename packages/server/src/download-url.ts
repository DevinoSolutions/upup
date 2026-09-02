// packages/server/src/download-url.ts
//
// Sign a GET for an object that ALREADY exists (#343). Before this, the only
// signed-GET producer was buried in the upload flow, so "give me a fresh
// download URL for a key I stored last month" meant standing up a second
// handler with an identity keyStrategy and using half of it. This is that
// operation on its own, with no handler, no routing, and no token involved.
//
// It is read-only and does NOT authorize anything: callers are responsible for
// deciding whether the current user may see the key they pass in.

import type { UpupServerConfig, UpupStorageConfig } from './config'
import { assertS3Storage } from './storage'
import {
    generateSignedPublicUrl,
    DEFAULT_DOWNLOAD_URL_EXPIRES_IN,
} from './providers/aws'

/** The slice of UpupServerConfig getDownloadUrl needs — pass your whole server
 *  config, or just `{ storage }`. */
export type DownloadUrlConfig = {
    storage: UpupStorageConfig
    downloadUrlExpiresIn?: UpupServerConfig['downloadUrlExpiresIn']
}

export interface GetDownloadUrlOptions {
    /** TTL in seconds for this URL only. Wins over `config.downloadUrlExpiresIn`. */
    expiresIn?: number
}

/**
 * A presigned GET URL for `key`. Expiry resolves per-call `expiresIn` ->
 * `config.downloadUrlExpiresIn` -> 3 days. Throws UpupConfigError when
 * `storage.type` has no S3-compatible API, matching createUpupHandler's
 * construct-time guard.
 */
export async function getDownloadUrl(
    config: DownloadUrlConfig,
    key: string,
    opts?: GetDownloadUrlOptions,
): Promise<string> {
    assertS3Storage(config.storage)
    const expiresIn =
        opts?.expiresIn ??
        config.downloadUrlExpiresIn ??
        DEFAULT_DOWNLOAD_URL_EXPIRES_IN
    return generateSignedPublicUrl(config.storage, key, expiresIn)
}
