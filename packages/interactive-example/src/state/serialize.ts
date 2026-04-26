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

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function diffAgainstDefaults(
    value: unknown,
    defaultValue: unknown,
): { omit: true } | { omit: false; value: unknown } {
    if (deepEqual(value, defaultValue)) return { omit: true }
    if (isPlainObject(value) && isPlainObject(defaultValue)) {
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(value)) {
            const res = diffAgainstDefaults(v, defaultValue[k])
            if (!res.omit) out[k] = res.value
        }
        if (Object.keys(out).length === 0) return { omit: true }
        return { omit: false, value: out }
    }
    return { omit: false, value }
}

/**
 * Strip every key whose value matches its declared default, descending into
 * nested objects. Keeps permalinks short — users only pay URL length for what
 * they actually changed, even when the change is a single nested leaf.
 */
function omitDefaults(config: UpupConfig, defaults: UpupConfig): UpupConfig {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(config)) {
        const res = diffAgainstDefaults(v, (defaults as Record<string, unknown>)[k])
        if (!res.omit) out[k] = res.value
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
