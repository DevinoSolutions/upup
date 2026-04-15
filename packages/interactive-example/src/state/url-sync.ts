import type { UpupConfig } from '../types'
import { serialize } from './serialize'
import { deserialize } from './deserialize'

export function readConfigFromUrl(): UpupConfig {
    if (typeof window === 'undefined') return {}
    const params = new URLSearchParams(window.location.search)
    const token = params.get('c')
    if (!token) return {}
    return deserialize(token)
}

export function writeConfigToUrl(config: UpupConfig): void {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const token = serialize(config)
    if (token) {
        params.set('c', token)
    } else {
        params.delete('c')
    }
    const query = params.toString()
    const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    window.history.replaceState(null, '', url)
}

export function buildPermalink(config: UpupConfig): string {
    if (typeof window === 'undefined') return ''
    const token = serialize(config)
    if (!token) return `${window.location.origin}${window.location.pathname}`
    return `${window.location.origin}${window.location.pathname}?c=${token}`
}
