import { describe, it, expect } from 'vitest'
import * as pkg from '../src/index'

/**
 * Pins @useupup/react's curated public runtime export list (F-142, canon for
 * preact + next's client entry, which both re-export this package wholesale).
 * A change here is a deliberate public-API change, not an accident.
 */
const EXPECTED_PUBLIC_VALUE_EXPORTS = [
    'ACCEPT_PRESETS',
    'AudioIcon',
    'BoxIcon',
    'CameraIcon',
    'DropboxIcon',
    'FileSource',
    'GoogleDriveIcon',
    'LinkIcon',
    'MyDeviceIcon',
    'OneDriveIcon',
    'ScreenCaptureIcon',
    'StorageProvider',
    'UpupThemeProvider',
    'UpupUploader',
    'resolveAccept',
    'useIsClient',
    'useUploaderContext',
    'useUploaderEditor',
    'useUploaderFiles',
    'useUploaderI18n',
    'useUploaderOptions',
    'useUploaderRuntime',
    'useUploaderSource',
    'useUploaderTheme',
    'useUploaderUploadControls',
    'useUploaderView',
    'useUpupUpload',
].sort()

describe('public API surface (F-142)', () => {
    it('exposes exactly the curated runtime export list from the package entry', () => {
        const actual = Object.keys(pkg).sort()
        expect(actual).toEqual(EXPECTED_PUBLIC_VALUE_EXPORTS)
    })
})
