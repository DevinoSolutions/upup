// packages/server/src/resolve-storage.ts
//
// Per-request storage resolution (#337). `config.storage` is either one static
// object — in which case every function here is a passthrough and behavior is
// byte-identical to before — or a resolver invoked per request.
//
// The hard part is the multipart lifecycle. `init` resolves a bucket, but
// `sign-part` / `complete` / `abort` arrive later carrying only a token, with
// none of the metadata the routing decision was made from. Re-running the
// resolver blind would send them somewhere else. Accepting a client-supplied
// hint would let anyone redirect a continuation into a bucket of their
// choosing.
//
// So `init` stamps a STORAGE IDENTITY into the HMAC-signed upload token, and
// each continuation hands it back to the resolver as `ctx.storageId`. The
// resolver returns the matching storage; the server then re-derives the
// identity of what came back and rejects a mismatch. The client never supplies
// the identity unsigned, and a resolver that ignores `storageId` fails closed
// rather than writing to the wrong bucket.
//
// The identity is a hash of the DESTINATION (bucket + endpoint + region), never
// of credentials: rotating an access key must not strand in-flight uploads, and
// nothing secret may sit in a token the client can read.

import { UpupConfigError } from '@useupup/core'
import type {
    UpupServerConfig,
    UpupStorageConfig,
    UpupStorageResolver,
    StorageResolverContext,
} from './config'
import { assertS3Storage } from './storage'

export function isStorageResolver(
    storage: UpupServerConfig['storage'],
): storage is UpupStorageResolver {
    return typeof storage === 'function'
}

/**
 * A stable, opaque, non-secret id for a storage DESTINATION. Deterministic
 * across instances and restarts (a plain SHA-256), so a token issued by one
 * worker verifies on any other.
 */
export async function storageIdentity(
    storage: UpupStorageConfig,
): Promise<string> {
    const material = [
        storage.bucket,
        storage.endpoint ?? '',
        storage.region,
    ].join('\n')
    const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(material),
    )
    return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 32)
}

/** The same required-field rules validateServerConfig applies at construct
 *  time, applied to what a resolver just returned. */
function assertResolvedStorage(
    storage: unknown,
): asserts storage is UpupStorageConfig {
    const s = storage as Partial<UpupStorageConfig> | null | undefined
    const missing: string[] = []
    if (!s || typeof s !== 'object') {
        throw new UpupConfigError(
            '[@useupup/server] the storage resolver did not return a storage config object.',
        )
    }
    if (typeof s.bucket !== 'string' || s.bucket.trim() === '')
        missing.push('bucket')
    if (typeof s.region !== 'string' || s.region.trim() === '')
        missing.push('region')
    if (missing.length > 0) {
        throw new UpupConfigError(
            '[@useupup/server] the storage resolver returned a config missing required field(s): ' +
                missing.map(m => `storage.${m}`).join(', '),
        )
    }
    assertS3Storage(s as UpupStorageConfig)
}

/**
 * The storage for one request. Static configs are returned as-is (already
 * validated at construct time); a resolver's result is validated here, because
 * this is the first moment it exists.
 *
 * Throws UpupConfigError on a bad result — callers turn that into a 500 through
 * the Responder rather than letting a misrouted upload proceed.
 */
export async function resolveStorage(
    config: UpupServerConfig,
    ctx: StorageResolverContext,
): Promise<UpupStorageConfig> {
    if (!isStorageResolver(config.storage)) return config.storage
    const resolved = await config.storage(ctx)
    assertResolvedStorage(resolved)
    return resolved
}

/**
 * Resolve for a multipart CONTINUATION and prove it landed where `init` did.
 *
 * A token with no `sid` predates the resolver (or was issued while `storage`
 * was still static) and is rejected rather than routed by guesswork — upload
 * tokens live an hour, so the client simply restarts from `init`.
 */
export async function resolveBoundStorage(
    config: UpupServerConfig,
    ctx: StorageResolverContext,
    boundId: string | undefined,
): Promise<UpupStorageConfig> {
    if (!isStorageResolver(config.storage)) return config.storage
    if (!boundId) {
        throw new StorageBindingError(
            'Upload token carries no storage binding; restart the upload from /multipart/init',
        )
    }
    const resolved = await resolveStorage(config, {
        ...ctx,
        storageId: boundId,
    })
    if ((await storageIdentity(resolved)) !== boundId) {
        throw new StorageBindingError(
            'Upload token is bound to different storage than the resolver returned',
        )
    }
    return resolved
}

/** A continuation that cannot be proven to reach the storage its init chose.
 *  Distinct from UpupConfigError because it is a 403, not a 500 — the request
 *  is not authorized for that storage, the server is not misconfigured. */
export class StorageBindingError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'StorageBindingError'
    }
}
