import { describe, it, expect, vi, afterEach } from 'vitest'
import { UpupCore } from '../src/core'
import { UpupErrorCode, UpupValidationError } from '../src/errors'

const makeFile = (name: string, size = 10, type = 'image/png') =>
    new File(['x'.repeat(size)], name, { type })

afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

/** Stand-in for a browser: `window` and `globalThis.reportError` exist, so core
 *  reports a throwing host hook through it (reaching window.onerror / Sentry).
 *  Pass an implementation to make `reportError` itself misbehave. */
function stubReportError(implementation?: (err: unknown) => void) {
    const reportError = vi.fn(implementation)
    vi.stubGlobal('window', {})
    vi.stubGlobal('reportError', reportError)
    return reportError
}

/** Stand-in for Deno / Bun: `reportError` exists but there is no browser or
 *  worker scope, so core must not call it (it may treat the event as fatal). */
function stubReportErrorWithoutBrowserScope() {
    const reportError = vi.fn()
    vi.stubGlobal('reportError', reportError)
    return {
        reportError,
        consoleError: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
}

/** Stand-in for Node / SSR: no `reportError`, so core falls back to
 *  `console.error`. Stubbed explicitly so the test does not depend on which
 *  runtime vitest happens to run in. */
function stubNoReportError() {
    vi.stubGlobal('reportError', undefined)
    return vi.spyOn(console, 'error').mockImplementation(() => {})
}

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
        const reportError = stubReportError()
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        const events: string[] = []
        core.on('restriction-failed', ({ error }) => {
            events.push((error as UpupValidationError).file.name)
        })
        const hookError = new Error('host toast blew up')
        const onRefused = vi.fn(() => {
            throw hookError
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
        // Each throw is reported, not swallowed: once per refusal.
        expect(reportError.mock.calls).toEqual([[hookError], [hookError]])
        core.destroy()
    })

    it('reports the host error through reportError in production, where it used to leave no trace', async () => {
        vi.stubEnv('NODE_ENV', 'production')
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const reportError = stubReportError()
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        const hookError = new Error('host toast blew up')

        await expect(
            core.addFiles(
                [makeFile('a.zip', 8, 'application/zip'), makeFile('ok.png')],
                undefined,
                {
                    onRefused: () => {
                        throw hookError
                    },
                },
            ),
        ).resolves.toBeUndefined()

        expect([...core.files.values()].map(f => f.name)).toEqual(['ok.png'])
        expect(reportError).toHaveBeenCalledTimes(1)
        expect(reportError).toHaveBeenCalledWith(hookError)
        expect(warn).not.toHaveBeenCalled()
        core.destroy()
    })

    it('falls back to console.error in production when reportError is absent, and nothing is thrown', async () => {
        vi.stubEnv('NODE_ENV', 'production')
        const consoleError = stubNoReportError()
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        const hookError = new Error('host toast blew up')

        await expect(
            core.addFiles(
                [makeFile('a.zip', 8, 'application/zip'), makeFile('ok.png')],
                undefined,
                {
                    onRefused: () => {
                        throw hookError
                    },
                },
            ),
        ).resolves.toBeUndefined()

        expect([...core.files.values()].map(f => f.name)).toEqual(['ok.png'])
        expect(consoleError).toHaveBeenCalledTimes(1)
        expect(consoleError).toHaveBeenCalledWith(
            expect.stringContaining('refusal hook'),
            hookError,
        )
        core.destroy()
    })

    it('does not call reportError outside a browser or worker scope, and uses console.error instead', async () => {
        const { reportError, consoleError } =
            stubReportErrorWithoutBrowserScope()
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        const hookError = new Error('host toast blew up')

        await expect(
            core.addFiles(
                [makeFile('a.zip', 8, 'application/zip'), makeFile('ok.png')],
                undefined,
                {
                    onRefused: () => {
                        throw hookError
                    },
                },
            ),
        ).resolves.toBeUndefined()

        expect(reportError).not.toHaveBeenCalled()
        expect(consoleError).toHaveBeenCalledTimes(1)
        expect(consoleError).toHaveBeenCalledWith(
            expect.stringContaining('refusal hook'),
            hookError,
        )
        core.destroy()
    })

    it('uses reportError in a worker scope, where there is no window', async () => {
        const reportError = vi.fn()
        vi.stubGlobal('reportError', reportError)
        vi.stubGlobal('WorkerGlobalScope', function WorkerGlobalScope() {})
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        const hookError = new Error('host toast blew up')

        await core.addFiles(
            [makeFile('a.zip', 8, 'application/zip'), makeFile('ok.png')],
            undefined,
            {
                onRefused: () => {
                    throw hookError
                },
            },
        )

        expect(reportError).toHaveBeenCalledWith(hookError)
        core.destroy()
    })

    it('survives reportError itself throwing: the add resolves, console.error hears it and later refusals are still reported', async () => {
        stubReportError(() => {
            throw new Error('reporter exploded')
        })
        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {})
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        const events: string[] = []
        core.on('restriction-failed', ({ error }) => {
            events.push((error as UpupValidationError).file.name)
        })
        const hookError = new Error('host toast blew up')
        const onRefused = vi.fn(() => {
            throw hookError
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
        expect(onRefused).toHaveBeenCalledTimes(2)
        expect(events).toEqual(['a.zip', 'b.exe'])
        expect(consoleError).toHaveBeenCalledTimes(2)
        expect(consoleError).toHaveBeenCalledWith(
            expect.stringContaining('refusal hook'),
            hookError,
        )
        core.destroy()
    })

    it('setFiles resolves and keeps the accepted file when the hook throws', async () => {
        const reportError = stubReportError()
        const core = new UpupCore({ allowedFileTypes: 'image/*' })
        const hookError = new Error('host toast blew up')

        await expect(
            core.setFiles(
                [makeFile('a.zip', 8, 'application/zip'), makeFile('ok.png')],
                {
                    onRefused: () => {
                        throw hookError
                    },
                },
            ),
        ).resolves.toBeUndefined()

        expect([...core.files.values()].map(f => f.name)).toEqual(['ok.png'])
        expect(reportError).toHaveBeenCalledWith(hookError)
        core.destroy()
    })
})
