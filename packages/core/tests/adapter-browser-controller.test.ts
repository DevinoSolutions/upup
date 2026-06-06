import { describe, it, expect } from 'vitest'
import {
    GOOGLE_DRIVE_DESCRIPTOR,
    ONE_DRIVE_DESCRIPTOR,
    DROPBOX_DESCRIPTOR,
    BOX_DESCRIPTOR,
} from '../src/adapters/drive-browser-descriptors'

describe('drive-browser descriptors', () => {
    it('one-drive uses the onedrive event prefix despite its one-drive plugin id', () => {
        expect(ONE_DRIVE_DESCRIPTOR.pluginId).toBe('one-drive')
        expect(ONE_DRIVE_DESCRIPTOR.eventPrefix).toBe('onedrive')
    })

    it('dropbox is path-based, the others are id-based', () => {
        expect(DROPBOX_DESCRIPTOR.folderKey).toBe('path')
        expect(GOOGLE_DRIVE_DESCRIPTOR.folderKey).toBe('id')
        expect(ONE_DRIVE_DESCRIPTOR.folderKey).toBe('id')
        expect(BOX_DESCRIPTOR.folderKey).toBe('id')
    })

    it('only google-drive uses gis auth + cached-children selection', () => {
        expect(GOOGLE_DRIVE_DESCRIPTOR.auth).toBe('gis')
        expect(GOOGLE_DRIVE_DESCRIPTOR.selectFolder).toBe('cached-children')
        for (const d of [ONE_DRIVE_DESCRIPTOR, DROPBOX_DESCRIPTOR, BOX_DESCRIPTOR]) {
            expect(d.auth).toBe('popup')
            expect(d.selectFolder).toBe('load-all')
        }
    })
})
