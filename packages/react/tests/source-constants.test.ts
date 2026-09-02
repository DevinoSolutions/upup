import { describe, it, expect } from 'vitest'
import { FileSource } from '@useupup/core'
import { sourceNameKeys, uploadSourceObject } from '../src/lib/constants'

// ─────────────────────────────────────────────
// sourceNameKeys
// ─────────────────────────────────────────────
describe('sourceNameKeys', () => {
    it('maps local to "myDevice"', () => {
        expect(sourceNameKeys[FileSource.LOCAL]).toBe('myDevice')
    })

    it('maps googleDrive to "googleDrive"', () => {
        expect(sourceNameKeys[FileSource.GOOGLE_DRIVE]).toBe('googleDrive')
    })

    it('maps oneDrive to "oneDrive"', () => {
        expect(sourceNameKeys[FileSource.ONE_DRIVE]).toBe('oneDrive')
    })

    it('maps dropbox to "dropbox"', () => {
        expect(sourceNameKeys[FileSource.DROPBOX]).toBe('dropbox')
    })

    it('maps url to "link"', () => {
        expect(sourceNameKeys[FileSource.URL]).toBe('link')
    })

    it('maps camera to "camera"', () => {
        expect(sourceNameKeys[FileSource.CAMERA]).toBe('camera')
    })

    it('maps microphone to "audio"', () => {
        expect(sourceNameKeys[FileSource.MICROPHONE]).toBe('audio')
    })

    it('maps screen to "screenCapture"', () => {
        expect(sourceNameKeys[FileSource.SCREEN]).toBe('screenCapture')
    })

    it('covers all FileSource values', () => {
        const sourceCount = Object.keys(FileSource).length
        const mappingCount = Object.keys(sourceNameKeys).length
        expect(mappingCount).toBe(sourceCount)
    })
})

// ─────────────────────────────────────────────
// uploadSourceObject
// ─────────────────────────────────────────────
describe('uploadSourceObject', () => {
    it('has an entry for every FileSource', () => {
        const sourceCount = Object.keys(FileSource).length
        expect(Object.keys(uploadSourceObject).length).toBe(sourceCount)
    })

    it('local entry has undefined Component (device file picker)', () => {
        expect(uploadSourceObject[FileSource.LOCAL].Component).toBeUndefined()
    })

    it('microphone entry has a Component', () => {
        expect(
            uploadSourceObject[FileSource.MICROPHONE].Component,
        ).toBeDefined()
    })

    it('screen entry has a Component', () => {
        expect(uploadSourceObject[FileSource.SCREEN].Component).toBeDefined()
    })

    it('googleDrive entry has a Component', () => {
        expect(
            uploadSourceObject[FileSource.GOOGLE_DRIVE].Component,
        ).toBeDefined()
    })

    it('oneDrive entry has a Component', () => {
        expect(uploadSourceObject[FileSource.ONE_DRIVE].Component).toBeDefined()
    })

    it('dropbox entry has a Component', () => {
        expect(uploadSourceObject[FileSource.DROPBOX].Component).toBeDefined()
    })

    it('url entry has a Component', () => {
        expect(uploadSourceObject[FileSource.URL].Component).toBeDefined()
    })

    it('camera entry has a Component', () => {
        expect(uploadSourceObject[FileSource.CAMERA].Component).toBeDefined()
    })

    it('each entry id matches its FileSource key', () => {
        for (const [key, entry] of Object.entries(uploadSourceObject)) {
            expect(entry.id).toBe(key)
        }
    })

    it('each entry nameKey matches sourceNameKeys', () => {
        for (const [key, entry] of Object.entries(uploadSourceObject)) {
            expect(entry.nameKey).toBe(sourceNameKeys[key as FileSource])
        }
    })

    it('each entry has an Icon', () => {
        for (const entry of Object.values(uploadSourceObject)) {
            expect(entry.Icon).toBeDefined()
        }
    })
})
