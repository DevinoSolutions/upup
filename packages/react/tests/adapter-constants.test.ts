import { describe, it, expect } from 'vitest'
import { adapterNameKeys, uploadAdapterObject } from '../src/lib/constants'
import { UploadAdapter } from '../src/shared/types'

// ─────────────────────────────────────────────
// adapterNameKeys
// ─────────────────────────────────────────────
describe('adapterNameKeys', () => {
    it('maps INTERNAL to "myDevice"', () => {
        expect(adapterNameKeys[UploadAdapter.INTERNAL]).toBe('myDevice')
    })

    it('maps GOOGLE_DRIVE to "googleDrive"', () => {
        expect(adapterNameKeys[UploadAdapter.GOOGLE_DRIVE]).toBe('googleDrive')
    })

    it('maps ONE_DRIVE to "oneDrive"', () => {
        expect(adapterNameKeys[UploadAdapter.ONE_DRIVE]).toBe('oneDrive')
    })

    it('maps DROPBOX to "dropbox"', () => {
        expect(adapterNameKeys[UploadAdapter.DROPBOX]).toBe('dropbox')
    })

    it('maps LINK to "link"', () => {
        expect(adapterNameKeys[UploadAdapter.LINK]).toBe('link')
    })

    it('maps CAMERA to "camera"', () => {
        expect(adapterNameKeys[UploadAdapter.CAMERA]).toBe('camera')
    })

    it('maps AUDIO to "audio"', () => {
        expect(adapterNameKeys[UploadAdapter.AUDIO]).toBe('audio')
    })

    it('maps SCREEN to "screenCapture"', () => {
        expect(adapterNameKeys[UploadAdapter.SCREEN]).toBe('screenCapture')
    })

    it('covers all 8 UploadAdapter values', () => {
        const adapterCount = Object.keys(UploadAdapter).length
        const mappingCount = Object.keys(adapterNameKeys).length
        expect(mappingCount).toBe(adapterCount)
    })
})

// ─────────────────────────────────────────────
// uploadAdapterObject
// ─────────────────────────────────────────────
describe('uploadAdapterObject', () => {
    it('has an entry for every UploadAdapter', () => {
        const adapterCount = Object.keys(UploadAdapter).length
        expect(Object.keys(uploadAdapterObject).length).toBe(adapterCount)
    })

    it('INTERNAL entry has undefined Component (device file picker)', () => {
        expect(uploadAdapterObject[UploadAdapter.INTERNAL].Component).toBeUndefined()
    })

    it('AUDIO entry has undefined Component (not yet implemented)', () => {
        expect(uploadAdapterObject[UploadAdapter.AUDIO].Component).toBeUndefined()
    })

    it('SCREEN entry has undefined Component (not yet implemented)', () => {
        expect(uploadAdapterObject[UploadAdapter.SCREEN].Component).toBeUndefined()
    })

    it('GOOGLE_DRIVE entry has a Component', () => {
        expect(uploadAdapterObject[UploadAdapter.GOOGLE_DRIVE].Component).toBeDefined()
    })

    it('ONE_DRIVE entry has a Component', () => {
        expect(uploadAdapterObject[UploadAdapter.ONE_DRIVE].Component).toBeDefined()
    })

    it('DROPBOX entry has a Component', () => {
        expect(uploadAdapterObject[UploadAdapter.DROPBOX].Component).toBeDefined()
    })

    it('LINK entry has a Component', () => {
        expect(uploadAdapterObject[UploadAdapter.LINK].Component).toBeDefined()
    })

    it('CAMERA entry has a Component', () => {
        expect(uploadAdapterObject[UploadAdapter.CAMERA].Component).toBeDefined()
    })

    it('each entry id matches its UploadAdapter key', () => {
        for (const [key, entry] of Object.entries(uploadAdapterObject)) {
            expect(entry.id).toBe(key)
        }
    })

    it('each entry nameKey matches adapterNameKeys', () => {
        for (const [key, entry] of Object.entries(uploadAdapterObject)) {
            expect(entry.nameKey).toBe(adapterNameKeys[key as UploadAdapter])
        }
    })

    it('each entry has an Icon', () => {
        for (const entry of Object.values(uploadAdapterObject)) {
            expect(entry.Icon).toBeDefined()
        }
    })
})
