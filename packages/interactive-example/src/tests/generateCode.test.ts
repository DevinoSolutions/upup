import { describe, it, expect } from 'vitest'
import { generateCode } from '../code/generateCode'

describe('generateCode', () => {
    it('renders minimal config with just provider', () => {
        const out = generateCode({ provider: 'backblaze' as any })
        expect(out).toContain("import { UpupUploader } from '@upupjs/react'")
        expect(out).toContain("import '@upupjs/react/styles'")
        expect(out).toContain('export default function App()')
        expect(out).toContain('<UpupUploader')
        expect(out).toContain('provider="backblaze"')
    })

    it('uses bool shorthand for true values', () => {
        const out = generateCode({ resumable: true } as any)
        expect(out).toMatch(/resumable(\s|\n)/)
        expect(out).not.toContain('resumable={true}')
    })

    it('renders numbers in braces', () => {
        const out = generateCode({ maxConcurrentUploads: 5 } as any)
        expect(out).toContain('maxConcurrentUploads={5}')
    })

    it('omits props with default/empty values', () => {
        const out = generateCode({})
        expect(out).not.toContain('provider=')
    })

    it('pretty-prints nested objects', () => {
        const out = generateCode({
            cloudDrives: { googleDrive: { clientId: 'abc' } },
        } as any)
        expect(out).toContain('cloudDrives={{')
        expect(out).toContain('googleDrive')
        expect(out).toContain("clientId: 'abc'")
    })

    it('emits onX handlers as console.log stubs when events toggles are set', () => {
        const out = generateCode({
            events: {
                onError: true,
                onFileUploadComplete: true,
                onPrepareFiles: true,
            } as any,
        } as any)
        expect(out).toContain(
            "onError={(...args) => console.log('onError', ...args)}",
        )
        expect(out).toContain(
            "onFileUploadComplete={(...args) => console.log('onFileUploadComplete', ...args)}",
        )
        expect(out).toContain(
            "onPrepareFiles={(files, ...args) => { console.log('onPrepareFiles', files, ...args); return files }}",
        )
    })

    it('recursively omits nested defaults — only the diverging leaf appears', () => {
        const config = {
            theme: {
                mode: 'system',
                tokens: { color: { primary: '' } },
                slots: { uploader: { container: 'ring-4' } },
            },
        } as any
        const defaults = {
            theme: {
                mode: 'system',
                tokens: { color: { primary: '' } },
            },
        } as any
        const out = generateCode(config, defaults)
        expect(out).toContain("container: 'ring-4'")
        expect(out).not.toMatch(/mode:\s*'system'/)
        expect(out).not.toMatch(/primary:\s*''/)
    })

    it('renders explicit false as {false}', () => {
        const out = generateCode(
            { showBranding: false } as any,
            { showBranding: true } as any,
        )
        expect(out).toContain('showBranding={false}')
    })

    it('omits objects where all values are undefined', () => {
        const out = generateCode({ resumable: { protocol: undefined } } as any)
        expect(out).not.toContain('resumable')
    })

    it('quotes object keys that contain dots or special characters', () => {
        const out = generateCode({
            theme: { slots: { 'uploader.container': 'ring-4' } },
            i18n: { overrides: { 'common.upload': 'Send' } },
        } as any)
        expect(out).toContain("'uploader.container': 'ring-4'")
        expect(out).toContain("'common.upload': 'Send'")
        expect(out).not.toContain('uploader.container:')
    })

    it('omits a top-level key entirely when every nested leaf matches the default', () => {
        const config = {
            theme: { mode: 'system', tokens: { color: { primary: '' } } },
            provider: 'aws',
        } as any
        const defaults = {
            theme: { mode: 'system', tokens: { color: { primary: '' } } },
            provider: 'aws',
        } as any
        const out = generateCode(config, defaults)
        expect(out).not.toContain('theme')
        expect(out).not.toContain('provider')
    })

    it('imports locale bundles for copy-pasteable i18n config', () => {
        const out = generateCode(
            {
                i18n: { locale: 'ar-SA', fallbackLocale: 'fr-FR' },
            } as any,
            {
                i18n: { locale: 'en-US', fallbackLocale: 'en-US' },
            } as any,
        )

        expect(out).toContain("import { arSA, frFR } from '@upupjs/core'")
        expect(out).toContain('locale: arSA')
        expect(out).toContain('fallbackLocale: frFR')
        expect(out).not.toContain("locale: 'ar-SA'")
    })

    it('does not import locale bundles that were removed by default diffing', () => {
        const out = generateCode(
            {
                uploadEndpoint: '/api/upup-mock/presign',
                i18n: { locale: 'en-US', fallbackLocale: 'en-US' },
            } as any,
            {
                i18n: { locale: 'en-US', fallbackLocale: 'en-US' },
            } as any,
        )

        expect(out).toContain('uploadEndpoint="/api/upup-mock/presign"')
        expect(out).not.toContain("from '@upupjs/core'")
        expect(out).not.toContain('i18n=')
    })

    it('renders comma-separated CORS origins as an array', () => {
        const out = generateCode({
            cors: {
                dangerouslyAutoConfigure: true,
                allowedOrigins: 'http://localhost:3000, https://example.com',
            },
        } as any)

        expect(out).toContain('dangerouslyAutoConfigure: true')
        expect(out).toContain('allowedOrigins: [')
        expect(out).toContain("'http://localhost:3000'")
        expect(out).toContain("'https://example.com'")
    })

    it('normalizes stale folder upload aliases out of generated code', () => {
        const out = generateCode({
            folderUpload: {
                enabled: true,
                showPickerButton: true,
                allowDrop: true,
                showSelectFolderButton: true,
            },
        } as any)

        expect(out).toContain('folderUpload={{')
        expect(out).toContain('allowDrop: true')
        expect(out).toContain('showSelectFolderButton: true')
        expect(out).not.toContain('enabled')
        expect(out).not.toContain('showPickerButton')
    })

    it('does not keep hidden client endpoint when server mode is selected', () => {
        const out = generateCode({
            mode: 'server',
            uploadEndpoint: '/api/upup-mock/presign',
            serverUrl: '/api/upup',
        } as any)

        expect(out).toContain('mode="server"')
        expect(out).toContain('serverUrl="/api/upup"')
        expect(out).not.toContain('uploadEndpoint')
    })

    it('does not keep presign or server endpoints when an external tus endpoint is selected', () => {
        const out = generateCode({
            uploadEndpoint: '/api/upup-mock/presign',
            serverUrl: '/api/upup',
            resumable: {
                protocol: 'tus',
                endpoint: '/api/upup-mock/tus',
            },
        } as any)

        expect(out).toContain("protocol: 'tus'")
        expect(out).toContain("endpoint: '/api/upup-mock/tus'")
        expect(out).not.toContain('uploadEndpoint')
        expect(out).not.toContain('serverUrl')
    })
})
