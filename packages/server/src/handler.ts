import { UpupErrorCode, UpupConfigError } from '@useupup/core'
import type { UpupServerConfig } from './config'
import { assertUploadTokenSecret } from './uploadToken'
import { validateServerConfig } from './validate-config'
import { assertS3Storage } from './storage'
import { isStorageResolver } from './resolve-storage'
import { handleHealth } from './health'
import { createResponder } from './respond'
import {
    handlePresign,
    handleMultipartInit,
    handleMultipartSignPart,
    handleMultipartComplete,
    handleMultipartAbort,
    handleMultipartResume,
    DEFAULT_MULTIPART_RESUME_WINDOW_SECONDS,
} from './upload-routes'
import { handleOAuthRedirect, handleOAuthCallback } from './oauth'
import { handleListFiles, handleFileTransfer } from './drive-routes'

export type RouteHandler = (req: Request) => Promise<Response>

export function createUpupHandler(config: UpupServerConfig): RouteHandler {
    // Secure-by-default: a stable token secret is mandatory (the multipart routes
    // are always live and issue/verify tokens), and drive/tokenStore use requires
    // a real identity resolver unless anonymous is explicitly opted into.
    assertUploadTokenSecret(config.uploadTokenSecret)

    // Fail-fast on missing/empty required fields (bucket/region, half-set creds,
    // provider creds) so a forgotten env var throws HERE, not as a confusing 500
    // at request time — and regardless of whether the app went through the opt-in
    // defineUpupConfig wrapper (F-852). Runs before the storage.type check below
    // so an entirely-missing `storage` is reported as such, not a TypeError.
    validateServerConfig(config)

    // Fail-fast (F-657): storage.type accepted all 21 StorageProvider values, but
    // the S3 upload path (buildS3ClientConfig) is honored by none of them — it
    // always builds an @aws-sdk/client-s3 client via endpoint/forcePathStyle/
    // credentials/region. A provider with no S3-compatible surface (currently
    // just Azure) could never function, with zero compile- or startup-time
    // signal until now.
    // A resolver has no type to check yet — the same guard runs on whatever it
    // returns, per request, in resolve-storage.ts (#337).
    if (!isStorageResolver(config.storage)) assertS3Storage(config.storage)
    if (
        (config.providers || config.tokenStore) &&
        !config.getUserId &&
        !config.allowAnonymous
    ) {
        throw new UpupConfigError(
            '[@useupup/server] drive providers / tokenStore require config.getUserId to ' +
                'scope tokens per user. Set getUserId, or set allowAnonymous:true to ' +
                'intentionally share ONE anonymous namespace (demos only).',
        )
    }

    // Loud construct-time signal: anonymous uploads accept unauthenticated
    // callers under a shared namespace. One line so a demo flag left on in
    // production is impossible to miss in the boot logs.
    if (config.allowAnonymousUploads) {
        console.warn(
            '[@useupup/server] allowAnonymousUploads:true — /presign and /multipart/init ' +
                'accept UNAUTHENTICATED uploads under a shared anonymous namespace. ' +
                'Demos / upstream-auth deployments only; never enable in multi-tenant production.',
        )
    }

    return async (req: Request): Promise<Response> => {
        const url = new URL(req.url)
        // Frameworks with trailing-slash normalization (Next.js
        // trailingSlash:true) 308 a POST /presign to /presign/ with method and
        // body preserved — match routes on the slash-stripped path so the
        // redirected request doesn't 404.
        const path = url.pathname.replace(/\/+$/, '') || '/'
        const res = createResponder(req, config)

        try {
            if (req.method === 'OPTIONS') {
                return res.noContent()
            }

            // Health check sits BEFORE the auth gate so uptime/deploy probes work
            // unauthenticated (F-426/F-428).
            if (req.method === 'GET' && path.endsWith('/health')) {
                return await handleHealth(config, res)
            }

            // Auth check
            if (config.auth) {
                const authorized = await config.auth(req)
                if (!authorized) {
                    return res.json({ error: 'Unauthorized' }, 401)
                }
            }

            // Route matching
            if (req.method === 'POST' && path.endsWith('/presign')) {
                return await handlePresign(req, config, res)
            }
            if (req.method === 'POST' && path.endsWith('/multipart/init')) {
                return await handleMultipartInit(req, config, res)
            }
            if (
                req.method === 'POST' &&
                path.endsWith('/multipart/sign-part')
            ) {
                return await handleMultipartSignPart(req, config, res)
            }
            if (req.method === 'POST' && path.endsWith('/multipart/complete')) {
                return await handleMultipartComplete(req, config, res)
            }
            if (req.method === 'POST' && path.endsWith('/multipart/abort')) {
                return await handleMultipartAbort(req, config, res)
            }
            // multipartResumeWindowSeconds:0 turns cross-reload resume OFF by
            // not routing at all — the path falls through to the 404 below, so a
            // disabled server is indistinguishable from one too old to have the
            // route, and clients already fall back to a fresh init on 4xx.
            if (
                req.method === 'POST' &&
                path.endsWith('/multipart/resume') &&
                (config.multipartResumeWindowSeconds ??
                    DEFAULT_MULTIPART_RESUME_WINDOW_SECONDS) > 0
            ) {
                return await handleMultipartResume(req, config, res)
            }

            // OAuth routes: GET /auth/:provider and GET /auth/:provider/cb
            const authMatch = path.match(/\/auth\/([\w-]+?)(?:\/(cb))?$/)
            if (req.method === 'GET' && authMatch) {
                const provider = authMatch[1]
                if (provider === undefined) {
                    return res.json({ error: 'Not found' }, 404)
                }
                const isCallback = authMatch[2] === 'cb'
                if (isCallback) {
                    return await handleOAuthCallback(req, config, provider, res)
                }
                return await handleOAuthRedirect(req, config, provider, res)
            }

            // File routes: GET /files/:provider and POST /files/:provider/transfer
            const filesMatch = path.match(
                /\/files\/([\w-]+?)(?:\/(transfer))?$/,
            )
            if (filesMatch) {
                const provider = filesMatch[1]
                if (provider === undefined) {
                    return res.json({ error: 'Not found' }, 404)
                }
                const isTransfer = filesMatch[2] === 'transfer'
                if (req.method === 'POST' && isTransfer) {
                    return await handleFileTransfer(req, config, provider, res)
                }
                if (req.method === 'GET' && !isTransfer) {
                    return await handleListFiles(req, config, provider, res)
                }
            }

            return res.json({ error: 'Not found' }, 404)
        } catch (error) {
            // Transport safety net (F-421/F-104): a last-resort catch so an unhandled
            // throw anywhere in routing surfaces as a logged, CORS-headered, coded 500
            // instead of an uncaught framework exception with no log and no CORS. This
            // is the single home for last-resort handling — the express/fastify/hono/
            // next adapters need no per-adapter catch of their own.
            return res.fail(
                'router',
                req.method,
                500,
                UpupErrorCode.STORAGE_ERROR,
                'Internal error',
                error,
            )
        }
    }
}
