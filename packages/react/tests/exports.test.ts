import { describe, it, expect } from 'vitest'
import * as ReactPackage from '../src/index'

describe('@upupjs/react public exports', () => {
    it('exports the React uploader and headless hook', () => {
        expect(ReactPackage.UpupUploader).toBeDefined()
        expect(typeof ReactPackage.useUpupUpload).toBe('function')
        expect(typeof ReactPackage.useIsClient).toBe('function')
    })

    it('exports canonical source and provider enums from @upupjs/core', () => {
        expect(ReactPackage.FileSource.LOCAL).toBe('local')
        expect(ReactPackage.FileSource.GOOGLE_DRIVE).toBe('googleDrive')
        expect(ReactPackage.StorageProvider.AWS).toBe('aws')
        expect(ReactPackage.StorageProvider.Azure).toBe('azure')
    })

    // The "internal surface is absent" case that sat here is implied by
    // public-api.test.ts, which asserts Object.keys(pkg) EQUALS an exact
    // 27-name list — anything not on that list is necessarily unexported, so
    // enumerating individual absent names could only ever go stale.
    it('exports the headless context hooks (parity with @upupjs/vue and @upupjs/svelte)', () => {
        for (const hook of [
            'useUploaderContext',
            'useUploaderRuntime',
            'useUploaderSource',
            'useUploaderI18n',
            'useUploaderFiles',
            'useUploaderUploadControls',
            'useUploaderView',
            'useUploaderEditor',
            'useUploaderOptions',
            'useUploaderTheme',
        ] as const) {
            expect(
                typeof (ReactPackage as Record<string, unknown>)[hook],
                hook,
            ).toBe('function')
        }
    })

    it('keeps utilities that are intentionally public', () => {
        expect(ReactPackage.UpupThemeProvider).toBeDefined()
        expect(ReactPackage.ACCEPT_PRESETS).toBeDefined()
    })
})
