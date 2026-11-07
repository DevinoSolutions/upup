import { describe, it, expect, vi, afterEach } from 'vitest'
import { UpupCore } from '../src/core'
import { UpupErrorCode, UpupValidationError } from '../src/errors'

const makeFile = (name: string, size = 10, type = 'image/png') =>
    new File(['x'.repeat(size)], name, { type })

afterEach(() => {
    vi.restoreAllMocks()
})

describe('hooks.onRefused on setFiles', () => {
    it('hears each refused file once while the acceptable one replaces the selection', async () => {
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        const refused: UpupValidationError[] = []

        await core.setFiles(
            [
                makeFile('bundle.zip', 8, 'application/zip'),
                makeFile('ok.png'),
                makeFile('tool.exe', 8, 'application/x-msdownload'),
            ],
            { onRefused: error => refused.push(error) },
        )

        expect([...core.files.values()].map(f => f.name)).toEqual(['ok.png'])
        expect(refused.map(e => [e.file.name, e.reason])).toEqual([
            ['bundle.zip', UpupErrorCode.TYPE_MISMATCH],
            ['tool.exe', UpupErrorCode.TYPE_MISMATCH],
        ])
        core.destroy()
    })

    it('still rejects with the first refusal when every file is refused, after the hook ran', async () => {
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        const onRefused = vi.fn()

        await expect(
            core.setFiles(
                [
                    makeFile('a.zip', 8, 'application/zip'),
                    makeFile('b.exe', 8, 'application/x-msdownload'),
                ],
                { onRefused },
            ),
        ).rejects.toMatchObject({ reason: UpupErrorCode.TYPE_MISMATCH })

        expect(onRefused).toHaveBeenCalledTimes(2)
        core.destroy()
    })
})

describe('a throwing refusal hook never fails the add that already succeeded', () => {
    it('addFiles resolves, keeps the accepted file and still reports every refusal', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        const events: string[] = []
        core.on('restriction-failed', ({ error }) => {
            events.push((error as UpupValidationError).file.name)
        })
        const onRefused = vi.fn(() => {
            throw new Error('host toast blew up')
        })

        await expect(
            core.addFiles(
                [
                    makeFile('a.zip', 8, 'application/zip'),
                    makeFile('ok.png'),
                    makeFile('b.exe', 8, 'application/x-msdownload'),
                ],
                undefined,
                { onRefused },
            ),
        ).resolves.toBeUndefined()

        expect([...core.files.values()].map(f => f.name)).toEqual(['ok.png'])
        // The first throw did not starve the second refusal of its report.
        expect(onRefused).toHaveBeenCalledTimes(2)
        expect(events).toEqual(['a.zip', 'b.exe'])
        expect(warn).toHaveBeenCalledTimes(2)
        core.destroy()
    })

    it('setFiles resolves and keeps the accepted file when the hook throws', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        const core = new UpupCore({ allowedFileTypes: 'image/*' })

        await expect(
            core.setFiles(
                [makeFile('a.zip', 8, 'application/zip'), makeFile('ok.png')],
                {
                    onRefused: () => {
                        throw new Error('host toast blew up')
                    },
                },
            ),
        ).resolves.toBeUndefined()

        expect([...core.files.values()].map(f => f.name)).toEqual(['ok.png'])
        core.destroy()
    })
})
