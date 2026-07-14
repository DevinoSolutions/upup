import { describe, it, expect } from 'vitest'
import { FileSource } from '@upupjs/core'

const sourceById: Record<string, FileSource> = {
    local: FileSource.LOCAL,
    camera: FileSource.CAMERA,
    url: FileSource.URL,
    googleDrive: FileSource.GOOGLE_DRIVE,
    oneDrive: FileSource.ONE_DRIVE,
    dropbox: FileSource.DROPBOX,
    box: FileSource.BOX,
    microphone: FileSource.MICROPHONE,
    screen: FileSource.SCREEN,
}

describe('canonical sources', () => {
    it('maps all canonical source names to FileSource values', () => {
        expect(sourceById.local).toBe('local')
        expect(sourceById.camera).toBe('camera')
        expect(sourceById.url).toBe('url')
        expect(sourceById.googleDrive).toBe('googleDrive')
        expect(sourceById.oneDrive).toBe('oneDrive')
        expect(sourceById.dropbox).toBe('dropbox')
        expect(sourceById.box).toBe('box')
        expect(sourceById.microphone).toBe('microphone')
        expect(sourceById.screen).toBe('screen')
    })

    it('resolves sources array to FileSource array', () => {
        const sources = ['local', 'googleDrive', 'camera']
        const resolved = sources.map(s => sourceById[s]).filter(Boolean)
        expect(resolved).toEqual(['local', 'googleDrive', 'camera'])
    })

    it('filters unknown sources', () => {
        const sources = ['local', 'invalid_source', 'camera']
        const resolved = sources.map(s => sourceById[s]).filter(Boolean)
        expect(resolved).toEqual(['local', 'camera'])
    })

    it('defaults include local and url when no sources provided', () => {
        const defaults = [FileSource.LOCAL, FileSource.URL]
        expect(defaults).toEqual(['local', 'url'])
    })
})
