// packages/server/src/uploadToken.ts
//
// Stateless, HMAC-signed upload token. Issued at multipart-init (binding the
// server-chosen key + S3 uploadId + size envelope + expiry) and re-derived from
// the VERIFIED token on sign-part / complete / abort, so the client can never
// assert the key/uploadId on the way back (closes S2). Web Crypto only, so it
// runs on Node 18+, edge, and Cloudflare Workers — matching the rest of the
// package (already uses global crypto.randomUUID / getRandomValues).

import { UpupConfigError } from '@upupjs/core'

export interface UploadTokenPayload {
    /** Object key the upload is bound to. */
    k: string
    /** S3 multipart uploadId. */
    u: string
    /** Resolved userId, or null for anonymous (server-namespaced) uploads. */
    uid: string | null
    /** Minimum allowed total size, bytes. */
    smin: number
    /** Maximum allowed total size, bytes. */
    smax: number
    /** Expiry, epoch SECONDS. */
    exp: number
}

export type UploadTokenErrorCode = 'malformed' | 'bad_signature' | 'expired'

export class UploadTokenError extends Error {
    code: UploadTokenErrorCode
    constructor(code: UploadTokenErrorCode, message: string) {
        super(message)
        this.name = 'UploadTokenError'
        this.code = code
    }
}

export const DEFAULT_UPLOAD_TOKEN_TTL_SECONDS = 3600
const MIN_SECRET_LENGTH = 16

/** Secure-by-default guard used at handler construction. */
export function assertUploadTokenSecret(
    secret: string | undefined,
): asserts secret is string {
    if (!secret || secret.length < MIN_SECRET_LENGTH) {
        throw new UpupConfigError(
            `[@upupjs/server] config.uploadTokenSecret is required and must be at least ${MIN_SECRET_LENGTH} characters. ` +
                'Generate a stable, high-entropy secret (e.g. `openssl rand -hex 32`) and share the SAME value across every server instance/worker.',
        )
    }
}

const encoder = new TextEncoder()

function bytesToBase64Url(bytes: Uint8Array): string {
    let bin = ''
    for (const byte of bytes) bin += String.fromCharCode(byte)
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(b64url: string): Uint8Array {
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
    const bin = atob(b64 + pad)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
    return new Uint8Array(sig)
}

/** Constant-time compare — never branch on content before lengths match. */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return diff === 0
}

export async function signUploadToken(
    secret: string,
    payload: UploadTokenPayload,
): Promise<string> {
    const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)))
    const sig = bytesToBase64Url(await hmacSha256(secret, body))
    return `${body}.${sig}`
}

export async function verifyUploadToken(
    secret: string,
    token: string,
    nowMs: number,
): Promise<UploadTokenPayload> {
    if (typeof token !== 'string' || !token.includes('.')) {
        throw new UploadTokenError(
            'malformed',
            'Upload token is missing or malformed',
        )
    }
    const [body, sig] = token.split('.')
    if (!body || !sig) {
        throw new UploadTokenError('malformed', 'Upload token is malformed')
    }
    // Verify the signature BEFORE trusting any payload bytes.
    const expected = bytesToBase64Url(await hmacSha256(secret, body))
    if (!timingSafeEqual(sig, expected)) {
        throw new UploadTokenError(
            'bad_signature',
            'Upload token signature is invalid',
        )
    }
    let payload: UploadTokenPayload
    try {
        payload = JSON.parse(
            new TextDecoder().decode(base64UrlToBytes(body)),
        ) as UploadTokenPayload
    } catch {
        throw new UploadTokenError(
            'malformed',
            'Upload token payload is not valid JSON',
        )
    }
    if (
        typeof payload.k !== 'string' ||
        typeof payload.u !== 'string' ||
        typeof payload.exp !== 'number' ||
        typeof payload.smin !== 'number' ||
        typeof payload.smax !== 'number'
    ) {
        throw new UploadTokenError(
            'malformed',
            'Upload token payload is missing required fields',
        )
    }
    if (payload.exp <= Math.floor(nowMs / 1000)) {
        throw new UploadTokenError('expired', 'Upload token has expired')
    }
    return payload
}
