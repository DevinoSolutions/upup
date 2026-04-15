import { describe, it, expect, beforeEach } from 'vitest'
import { readConfigFromUrl, writeConfigToUrl } from '../state/url-sync'
import { serialize } from '../state/serialize'

describe('url-sync', () => {
    beforeEach(() => {
        window.history.replaceState(null, '', '/')
    })

    it('readConfigFromUrl returns {} when no ?c=', () => {
        expect(readConfigFromUrl()).toEqual({})
    })

    it('readConfigFromUrl decodes ?c= token', () => {
        const token = serialize({ provider: 'backblaze' as any })
        window.history.replaceState(null, '', `/?c=${token}`)
        expect(readConfigFromUrl()).toEqual({ provider: 'backblaze' })
    })

    it('writeConfigToUrl sets ?c= param without pushing history', () => {
        const lengthBefore = window.history.length
        writeConfigToUrl({ provider: 'backblaze' as any })
        expect(window.location.search).toMatch(/^\?c=/)
        expect(window.history.length).toBe(lengthBefore)
    })

    it('writeConfigToUrl removes ?c= when config is empty', () => {
        window.history.replaceState(null, '', '/?c=xyz')
        writeConfigToUrl({})
        expect(window.location.search).toBe('')
    })

    it('writeConfigToUrl preserves other query params', () => {
        window.history.replaceState(null, '', '/?foo=bar')
        writeConfigToUrl({ provider: 'backblaze' as any })
        const params = new URLSearchParams(window.location.search)
        expect(params.get('foo')).toBe('bar')
        expect(params.get('c')).toBeTruthy()
    })
})
