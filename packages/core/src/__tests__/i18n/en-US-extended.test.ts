import { describe, it, expect } from 'vitest'
import { enUS } from '../../i18n/locales/en-US'

describe('en-US locale — content validity', () => {
    it('common namespace has core UI strings', () => {
        expect(enUS.messages.common.cancel).toBe('Cancel')
        expect(enUS.messages.common.done).toBe('Done')
        expect(typeof enUS.messages.common.loading).toBe('string')
    })

    it('sources namespace has all source names', () => {
        const sources = enUS.messages.sources
        expect(sources.myDevice).toBeDefined()
        expect(sources.googleDrive).toBeDefined()
        expect(sources.oneDrive).toBeDefined()
        expect(sources.dropbox).toBeDefined()
        expect(sources.link).toBeDefined()
        expect(sources.camera).toBeDefined()
    })

    it('errors namespace has error message templates', () => {
        const errors = enUS.messages.errors
        expect(typeof errors.failedToGetUploadUrl).toBe('string')
        expect(typeof errors.multipleFilesNotAllowed).toBe('string')
        expect(typeof errors.statusError).toBe('string')
    })

    it('dropzone namespace has drag/browse text', () => {
        expect(enUS.messages.dropzone.browseFiles).toBeDefined()
        expect(enUS.messages.dropzone.dragFilesHere).toBeDefined()
    })

    it('no empty string values in any namespace', () => {
        function checkNoEmpty(obj: Record<string, unknown>, path = '') {
            for (const [key, val] of Object.entries(obj)) {
                const fullPath = path ? `${path}.${key}` : key
                if (typeof val === 'string') {
                    expect(val.length, `${fullPath} is empty`).toBeGreaterThan(
                        0,
                    )
                } else if (typeof val === 'object' && val !== null) {
                    checkNoEmpty(val as Record<string, unknown>, fullPath)
                }
            }
        }
        checkNoEmpty(enUS.messages as unknown as Record<string, unknown>)
    })

    it('branding namespace exists', () => {
        expect(enUS.messages.branding).toBeDefined()
    })

    it('camera namespace has capture-related strings', () => {
        expect(enUS.messages.camera).toBeDefined()
        expect(typeof enUS.messages.camera.capture).toBe('string')
    })

    it('url namespace has fetch-related strings', () => {
        expect(enUS.messages.url).toBeDefined()
        expect(typeof enUS.messages.url.enterFileUrl).toBe('string')
        expect(typeof enUS.messages.url.fetch).toBe('string')
    })
})
