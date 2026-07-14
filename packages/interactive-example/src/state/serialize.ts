import pako from 'pako'
import type { UpupConfig } from '../types'
import { buildDefaultConfig } from '../categories'

/**
 * `?c=` permalink codec (design spec `2026-04-14-interactive-example-playground-design.md`
 * §5). Pipeline: `JSON.stringify -> pako.deflate -> base64url`. Gzip keeps
 * sparse configs small; base64url (`+`/`/` swapped, `=` padding stripped)
 * means the token can sit in a query string with no extra escaping.
 */

function bytesToBase64(bytes: Uint8Array): string {
    let binary = ''
    for (const byte of bytes) {
        binary += String.fromCharCode(byte)
    }
    return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes
}

function toBase64Url(base64: string): string {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(token: string): string {
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/')
    const remainder = base64.length % 4
    if (remainder === 1) {
        // No valid padding restores this to a legal base64 length — let the
        // caller's try/catch turn this into a graceful `{}`.
        throw new Error('Invalid base64url token length')
    }
    if (remainder > 0) {
        base64 += '='.repeat(4 - remainder)
    }
    return base64
}

/** Encode a config object into the `?c=` permalink token. */
export function encodeConfig(config: UpupConfig): string {
    const json = JSON.stringify(config)
    const deflated = pako.deflate(json)
    return toBase64Url(bytesToBase64(deflated))
}

/**
 * Decode a `?c=` permalink token back into a partial config.
 *
 * Schema-filters the result: any top-level key that isn't part of the
 * current config shape is dropped (spec: "drop keys that don't exist on the
 * current type"). The known-key set is derived from
 * `Object.keys(buildDefaultConfig())`, which contains every top-level prop
 * the category manifest declares a default for.
 *
 * Never throws — a malformed token, a corrupt deflate stream, non-JSON
 * payload, or a non-object payload all resolve to `{}` so a broken or
 * foreign `?c=` value can never crash the playground.
 */
export function decodeConfig(token: string): Partial<UpupConfig> {
    try {
        const bytes = base64ToBytes(fromBase64Url(token))
        const json = pako.inflate(bytes, { to: 'string' })
        const parsed: unknown = JSON.parse(json)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return {}
        }
        const knownKeys = new Set(Object.keys(buildDefaultConfig()))
        const out: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
            if (knownKeys.has(key)) {
                out[key] = value
            }
        }
        return out as Partial<UpupConfig>
    } catch {
        return {}
    }
}
