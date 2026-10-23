import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react'
import React, { useState } from 'react'
import {
    UpupCore,
    UploadStatus,
    FileSource,
    createTranslator,
    enUS,
} from '@useupup/core'

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

// ServerModeDriveUploader reads the runtime/theme/i18n/source contexts directly;
// mocking those hooks (with a REAL UpupCore behind useUploaderRuntime) is the
// smallest surface that still exercises the real controller -> core wiring.
const harness = vi.hoisted(() => ({
    core: undefined as unknown,
    // A REAL translator: the views map error codes through it, so a fake/undefined
    // one would hide wrong-message bugs.
    translator: undefined as unknown,
    setActiveSource: undefined as undefined | ((s: unknown) => void),
}))

vi.mock('../src/context/UploaderContext', () => ({
    useUploaderRuntime: () => ({
        serverUrl: 'http://localhost:9999',
        core: harness.core,
    }),
    useUploaderOptions: () => ({
        icons: { LoaderIcon: () => <div data-testid="loader-icon" /> },
    }),
    useUploaderTheme: () => ({ isDark: false, slotOverrides: {} }),
    useUploaderI18n: () => ({
        translator: harness.translator,
        translations: {
            logOut: 'Log out',
            authenticatePrompt: 'Sign in to {{provider}}',
            signInWith: 'Sign in with {{provider}}',
            driveLoadError: "Couldn't load files: {{message}}",
        },
    }),
    useUploaderSource: () => ({
        setActiveSource: (s: unknown) => harness.setActiveSource?.(s),
    }),
}))

import ServerModeDriveUploader from '../src/components/ServerModeDriveUploader'
import { SourceViewHeaderExtraContext } from '../src/context/SourceViewHeaderExtraContext'

harness.translator = createTranslator({ bundle: enUS })

const jsonRes = (status: number, body: unknown) => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    text: async () => JSON.stringify(body),
    clone() {
        return jsonRes(status, body)
    },
})

function stubServer(
    opts: {
        logoutStatus?: number
        transferStatus?: number
        // Drive listing; the transfer answers with each file's own key.
        names?: string[]
    } = {},
) {
    const names = opts.names ?? ['report.pdf']
    const calls: Array<{ url: string; method: string }> = []
    vi.stubGlobal(
        'fetch',
        vi.fn(
            async (url: string, init?: { method?: string; body?: string }) => {
                const method = init?.method ?? 'GET'
                calls.push({ url, method })
                if (url.endsWith('/files/google-drive/transfer')) {
                    const { fileId, fileName } = JSON.parse(init!.body!) as {
                        fileId: string
                        fileName: string
                    }
                    return jsonRes(opts.transferStatus ?? 200, {
                        provider: 'google-drive',
                        key: `uploads/${fileId}`,
                        name: fileName,
                        size: 2048,
                        type: 'application/pdf',
                        url: `https://cdn.example/${fileName}`,
                    })
                }
                if (url.endsWith('/files/google-drive/logout'))
                    return jsonRes(opts.logoutStatus ?? 200, {
                        provider: 'google-drive',
                        ok: true,
                    })
                return jsonRes(200, {
                    files: names.map((name, i) => ({
                        id: `f${i + 1}`,
                        name,
                        isFolder: false,
                        size: 2048,
                        mimeType: 'application/pdf',
                    })),
                })
            },
        ),
    )
    return calls
}

function Host({
    core,
    onBack = () => {},
}: {
    core: UpupCore
    onBack?: () => void
}): React.ReactElement {
    const [host, setHost] = useState<HTMLElement | null>(null)
    const [source, setSource] = useState<unknown>('googleDrive')
    harness.core = core
    harness.setActiveSource = setSource
    return (
        <div>
            <div data-testid="header-extra" ref={setHost} />
            {source !== undefined && (
                <SourceViewHeaderExtraContext.Provider value={host}>
                    <ServerModeDriveUploader
                        provider="google-drive"
                        onBack={onBack}
                    />
                </SourceViewHeaderExtraContext.Provider>
            )}
        </div>
    )
}

describe('ServerModeDriveUploader (T-6094, T-6093)', () => {
    it('a successful transfer lands as a completed row on core and returns to the selector', async () => {
        const calls = stubServer()
        const core = new UpupCore({})
        const onBack = vi.fn()
        const { findByText, getByText } = render(
            <Host core={core} onBack={onBack} />,
        )

        fireEvent.click(await findByText('report.pdf'))
        fireEvent.click(getByText(/Add files/))

        await waitFor(() => {
            expect(onBack).toHaveBeenCalledTimes(1)
        })
        expect(
            calls.some(
                c =>
                    c.method === 'POST' &&
                    c.url.endsWith('/files/google-drive/transfer'),
            ),
        ).toBe(true)
        const rows = [...core.files.values()]
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({
            name: 'report.pdf',
            size: 2048,
            key: 'uploads/f1',
            status: UploadStatus.SUCCESSFUL,
            source: FileSource.GOOGLE_DRIVE,
        })
        expect(core.status).toBe(UploadStatus.SUCCESSFUL)
    })

    it('Log out POSTs the logout route, leaves the drive view, and never re-opens the OAuth popup', async () => {
        const calls = stubServer()
        const open = vi.fn(() => null)
        vi.stubGlobal('open', open)
        const core = new UpupCore({})
        const { findByText, getByTestId, queryByTestId } = render(
            <Host core={core} />,
        )
        await findByText('report.pdf')

        // The control is portalled into the SourceView header host, like client mode.
        const logout = await waitFor(() => {
            const btn = getByTestId('header-extra').querySelector('button')
            expect(btn?.textContent).toBe('Log out')
            return btn as HTMLButtonElement
        })
        fireEvent.click(logout)

        await waitFor(() => {
            expect(queryByTestId('upup-server-drive-browser')).toBeNull()
        })
        expect(
            calls.filter(
                c =>
                    c.method === 'POST' &&
                    c.url === 'http://localhost:9999/files/google-drive/logout',
            ),
        ).toHaveLength(1)
        // Logging out must not bounce straight into a fresh sign-in popup.
        expect(open).not.toHaveBeenCalled()
        expect(getByTestId('header-extra').querySelector('button')).toBeNull()
    })

    it('a failed logout keeps the drive view open and shows the error', async () => {
        stubServer({ logoutStatus: 500 })
        const core = new UpupCore({})
        const { findByText, getByTestId, findByTestId } = render(
            <Host core={core} />,
        )
        await findByText('report.pdf')
        const logout = await waitFor(() => {
            const btn = getByTestId('header-extra').querySelector('button')
            expect(btn).not.toBeNull()
            return btn as HTMLButtonElement
        })
        fireEvent.click(logout)
        expect(await findByTestId('upup-drive-error')).not.toBeNull()
    })

    it('a failed transfer stays in the view: error shown, list kept, no onBack, nothing added', async () => {
        stubServer({ transferStatus: 500 })
        const core = new UpupCore({})
        const onBack = vi.fn()
        const { findByText, getByText, findByTestId, queryByText } = render(
            <Host core={core} onBack={onBack} />,
        )

        fireEvent.click(await findByText('report.pdf'))
        fireEvent.click(getByText(/Add files/))

        const error = await findByTestId('upup-drive-error')
        expect(error.getAttribute('role')).toBe('alert')
        expect(error.textContent).not.toBe('')
        expect(onBack).not.toHaveBeenCalled()
        expect(queryByText('report.pdf')).not.toBeNull()
        expect(core.files.size).toBe(0)
    })

    it('a transfer rejected by the core restrictions is not sent to the server and shows the reason', async () => {
        const calls = stubServer()
        const core = new UpupCore({ maxFileSize: { size: 1, unit: 'B' } })
        const onBack = vi.fn()
        const { findByText, getByText, findByTestId } = render(
            <Host core={core} onBack={onBack} />,
        )

        fireEvent.click(await findByText('report.pdf'))
        fireEvent.click(getByText(/Add files/))

        expect((await findByTestId('upup-drive-error')).textContent).toContain(
            'report.pdf',
        )
        expect(
            calls.some(c => c.url.endsWith('/files/google-drive/transfer')),
        ).toBe(false)
        expect(onBack).not.toHaveBeenCalled()
        expect(core.files.size).toBe(0)
    })

    it('a restriction rejection shows its own message through a real translator, not the generic upload-failed text', async () => {
        stubServer()
        const core = new UpupCore({ limit: 1 })
        core.addTransferredFile({
            name: 'prior.pdf',
            size: 1,
            type: 'application/pdf',
            key: 'uploads/prior.pdf',
            source: FileSource.GOOGLE_DRIVE,
        })
        const { findByText, getByText, findByTestId } = render(
            <Host core={core} />,
        )

        fireEvent.click(await findByText('report.pdf'))
        fireEvent.click(getByText(/Add files/))

        const text = (await findByTestId('upup-drive-error')).textContent
        expect(text).toBe('Adding 1 files would exceed the limit of 1')
    })

    it('a stale transfer error clears when the user searches again', async () => {
        const calls = stubServer({ transferStatus: 500 })
        const core = new UpupCore({})
        const {
            findByText,
            getByText,
            findByTestId,
            getByLabelText,
            queryByTestId,
        } = render(<Host core={core} />)
        const lists = () =>
            calls.filter(
                c =>
                    c.method === 'GET' && c.url.includes('/files/google-drive'),
            ).length

        fireEvent.click(await findByText('report.pdf'))
        fireEvent.click(getByText(/Add files/))
        await findByTestId('upup-drive-error')
        expect(lists()).toBe(1)

        fireEvent.keyDown(getByLabelText('Search'), { key: 'Enter' })
        await waitFor(() => {
            expect(lists()).toBe(2)
        })
        // The refreshed listing is back on screen, and the old error is gone.
        await findByText('report.pdf')
        await waitFor(() => {
            expect(queryByTestId('loader-icon')).toBeNull()
            expect(queryByTestId('upup-drive-error')).toBeNull()
        })
    })

    it('reports a 3-file selection ONCE with all 3 files', async () => {
        stubServer({ names: ['report.pdf', 'b.pdf', 'c.pdf'] })
        const core = new UpupCore({})
        const done = vi.fn()
        core.on('upload-all-complete', done)
        const onBack = vi.fn()
        const { findByText, getByText } = render(
            <Host core={core} onBack={onBack} />,
        )

        for (const name of ['report.pdf', 'b.pdf', 'c.pdf'])
            fireEvent.click(await findByText(name))
        fireEvent.click(getByText(/Add files/))
        await waitFor(() => {
            expect(onBack).toHaveBeenCalledTimes(1)
        })

        expect(core.files.size).toBe(3)
        expect(done).toHaveBeenCalledTimes(1)
        expect(
            (done.mock.calls[0]![0] as Array<{ key: string }>)
                .map(f => f.key)
                .sort(),
        ).toEqual(['uploads/f1', 'uploads/f2', 'uploads/f3'])
    })

    it('does not report when every transfer in the selection failed', async () => {
        stubServer({ transferStatus: 500 })
        const core = new UpupCore({})
        const done = vi.fn()
        core.on('upload-all-complete', done)
        const { findByText, getByText, findByTestId } = render(
            <Host core={core} />,
        )

        fireEvent.click(await findByText('report.pdf'))
        fireEvent.click(getByText(/Add files/))
        await findByTestId('upup-drive-error')

        expect(done).not.toHaveBeenCalled()
    })
})
