import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react'
import React, { useState } from 'react'
import { UpupCore, UploadStatus, FileSource } from '@useupup/core'

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

// ServerModeDriveUploader reads the runtime/theme/i18n/source contexts directly;
// mocking those hooks (with a REAL UpupCore behind useUploaderRuntime) is the
// smallest surface that still exercises the real controller -> core wiring.
const harness = vi.hoisted(() => ({
    core: undefined as unknown,
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
        translator: undefined,
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
    opts: { logoutStatus?: number; transferStatus?: number } = {},
) {
    const calls: Array<{ url: string; method: string }> = []
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init?: { method?: string }) => {
            const method = init?.method ?? 'GET'
            calls.push({ url, method })
            if (url.endsWith('/files/google-drive/transfer'))
                return jsonRes(opts.transferStatus ?? 200, {
                    provider: 'google-drive',
                    key: 'uploads/report.pdf',
                    name: 'report.pdf',
                    size: 2048,
                    type: 'application/pdf',
                    url: 'https://cdn.example/report.pdf',
                })
            if (url.endsWith('/files/google-drive/logout'))
                return jsonRes(opts.logoutStatus ?? 200, {
                    provider: 'google-drive',
                    ok: true,
                })
            return jsonRes(200, {
                files: [
                    {
                        id: 'f1',
                        name: 'report.pdf',
                        isFolder: false,
                        size: 2048,
                        mimeType: 'application/pdf',
                    },
                ],
            })
        }),
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
            key: 'uploads/report.pdf',
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
})
