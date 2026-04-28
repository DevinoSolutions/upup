import { describe, it, expect } from 'vitest'
import { generateCode } from '../code/generateCode'

describe('generateCode', () => {
    it('renders minimal config with just provider', () => {
        const out = generateCode({ provider: 'backblaze' as any })
        expect(out).toContain("import { UpupUploader } from 'upup-react-file-uploader'")
        expect(out).toContain("import 'upup-react-file-uploader/styles'")
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
            events: { onError: true, onFileUploadComplete: true } as any,
        } as any)
        expect(out).toContain("onError={(arg) => console.log('onError', arg)}")
        expect(out).toContain("onFileUploadComplete={(arg) => console.log('onFileUploadComplete', arg)}")
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
        const out = generateCode({ showBranding: false } as any, { showBranding: true } as any)
        expect(out).toContain('showBranding={false}')
    })

    it('omits objects where all values are undefined', () => {
        const out = generateCode({ resumable: { mode: undefined } } as any)
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
})
