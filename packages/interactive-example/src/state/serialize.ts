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

export function serialize(config: UpupConfig): string {
    if (isEmpty(config)) return ''
    const json = JSON.stringify(config)
    const compressed = deflate(json)
    return base64urlEncode(compressed)
}
