import { deflate } from 'pako'
import type { UpupConfig } from '../types'

function base64urlEncode(bytes: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const b64 = btoa(binary)
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function isEmpty(obj: UpupConfig): boolean {
    for (const _ in obj) return false
    return true
}

function deepEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true
    if (typeof a !== typeof b) return false
    if (a === null || b === null) return false
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false
        return a.every((x, i) => deepEqual(x, b[i]))
    }
    if (typeof a === 'object' && typeof b === 'object') {
        const ka = Object.keys(a as Record<string, unknown>)
        const kb = Object.keys(b as Record<string, unknown>)
        if (ka.length !== kb.length) return false
        return ka.every((k) => deepEqual((a as any)[k], (b as any)[k]))
    }
    return false
}

/**
 * Strip any top-level key whose value deep-equals the declared default.
 * Keeps permalinks short — users only pay URL length for what they changed.
 */
function omitDefaults(config: UpupConfig, defaults: UpupConfig): UpupConfig {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(config)) {
        if (!deepEqual(v, (defaults as Record<string, unknown>)[k])) {
            out[k] = v
        }
    }
    return out as UpupConfig
}

export function serialize(config: UpupConfig, defaults: UpupConfig = {}): string {
    const lean = omitDefaults(config, defaults)
    if (isEmpty(lean)) return ''
    const json = JSON.stringify(lean)
    const compressed = deflate(json)
    return base64urlEncode(compressed)
}
