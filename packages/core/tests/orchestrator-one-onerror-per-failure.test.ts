import { describe, it, expect, vi, afterEach } from 'vitest'
import { UpupCore } from '../src/core'
import { UploaderOrchestrator } from '../src/orchestrator/uploader-orchestrator'

const realFile = (name: string): File =>
    new File([new Uint8Array(4)], name, { type: 'text/plain' })

afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

function failingUpload(options: ConstructorParameters<typeof UpupCore>[0]) {
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
            throw new Error('presign down')
        }),
    )
    const core = new UpupCore({
        provider: 'aws',
        uploadEndpoint: '/api/presign',
        maxRetries: 0,
        ...options,
    })
    const onError = vi.fn()
    const orchestrator = new UploaderOrchestrator(core, { onError })
    orchestrator.init()
    return { core, orchestrator, onError }
}

describe('onError fires once per failure, not once more for the batch summary', () => {
    it('one failed file calls onError exactly once, with that file’s own error', async () => {
        const { core, orchestrator, onError } = failingUpload({})
        await core.addFiles([realFile('a.txt')])

        await expect(core.upload()).rejects.toThrow('1 file upload(s) failed')

        expect(onError).toHaveBeenCalledTimes(1)
        expect(onError.mock.calls[0]?.[0]).not.toContain('upload(s) failed')
        orchestrator.destroy()
        core.destroy()
    })

    it('two failed files call onError once each, not three times', async () => {
        const { core, orchestrator, onError } = failingUpload({})
        await core.addFiles([realFile('a.txt'), realFile('b.txt')])

        await expect(core.upload()).rejects.toThrow('2 file upload(s) failed')

        expect(onError).toHaveBeenCalledTimes(2)
        orchestrator.destroy()
        core.destroy()
    })

    it('a retry that fails again reports its own failure once', async () => {
        const { core, orchestrator, onError } = failingUpload({})
        await core.addFiles([realFile('a.txt')])
        await expect(core.upload()).rejects.toThrow()
        onError.mockClear()

        await expect(core.retry()).rejects.toThrow()

        expect(onError).toHaveBeenCalledTimes(1)
        orchestrator.destroy()
        core.destroy()
    })

    it('a run that fails before any file transfer (no upload target) still reports once', async () => {
        const core = new UpupCore({})
        const onError = vi.fn()
        const orchestrator = new UploaderOrchestrator(core, { onError })
        orchestrator.init()
        await core.addFiles([realFile('a.txt')])

        await expect(core.upload()).rejects.toThrow('No upload target')

        expect(onError).toHaveBeenCalledTimes(1)
        orchestrator.destroy()
        core.destroy()
    })

    it('the uploadError the UI shows still ends on the run-level summary', async () => {
        const { core, orchestrator } = failingUpload({})
        await core.addFiles([realFile('a.txt')])

        await expect(core.upload()).rejects.toThrow()

        expect(orchestrator.getSnapshot().uploadError).toBe(
            '1 file upload(s) failed',
        )
        orchestrator.destroy()
        core.destroy()
    })
})
