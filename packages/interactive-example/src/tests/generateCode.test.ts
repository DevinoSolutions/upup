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
})
