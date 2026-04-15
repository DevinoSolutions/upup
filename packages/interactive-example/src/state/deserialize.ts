import { inflate } from 'pako'
import type { UpupConfig } from '../types'

function base64urlDecode(token: string): Uint8Array {
    const padded =
        token.replace(/-/g, '+').replace(/_/g, '/') +
        '='.repeat((4 - (token.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
}

export function deserialize(token: string): UpupConfig {
    if (!token) return {}
    try {
        const bytes = base64urlDecode(token)
        const json = inflate(bytes, { to: 'string' })
        return JSON.parse(json)
    } catch (e) {
        console.warn('[interactive-example] Failed to deserialize config token:', e)
        return {}
    }
}
