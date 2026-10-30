import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from 'lit-html'
import {
    serverModeDriveUploader,
    destroyServerDrives,
} from '../src/templates/server-mode-drive-uploader'
import { setHeaderExtraHost } from '../src/context/source-view-header-extra'
import { UpupCore } from '@useupup/core'

// Log out (T-6093) and transfer-failure (T-6094 follow-up) behaviour of the
// vanilla server-mode drive view, driven through the real controller.
const settle = async () => {
    for (let i = 0; i < 10; i++) {
        await Promise.resolve()
        await new Promise(resolve => setTimeout(resolve, 0))
    }
}

function makeCtx() {
    return {
        serverUrl: 'http://localhost:53060',
        theme: { getSnapshot: () => ({ isDark: false, slotOverrides: {} }) },
        translations: {
            authenticatePrompt: 'Sign in to {{provider}}',
            signInWith: 'Sign in with {{provider}}',
            logOut: 'Log out',
        },
        translator: (key: string) => key,
        invalidate: vi.fn(),
        setActiveSource: vi.fn(),
    } as unknown as Parameters<typeof serverModeDriveUploader>[0] & {
        setActiveSource: ReturnType<typeof vi.fn>
    }
}

const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })

function stubDrive(opts: { transferStatus?: number } = {}) {
    const calls: Array<{ url: string; method: string }> = []
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init?: { method?: string }) => {
            calls.push({ url, method: init?.method ?? 'GET' })
            if (url.endsWith('/transfer'))
                return json(opts.transferStatus ?? 200, { error: 'boom' })
            if (url.endsWith('/logout')) return json(200, { ok: true })
            return json(200, {
                files: [{ id: '1', name: 'a.txt', isFolder: false, size: 3 }],
            })
        }),
    )
    return calls
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

describe('vanilla serverModeDriveUploader', () => {
    it('Log out POSTs /files/:provider/logout, returns to the selector and never opens the OAuth popup', async () => {
        const calls = stubDrive()
        const open = vi.spyOn(window, 'open').mockReturnValue(null)
        const ctx = makeCtx()
        const headerHost = document.createElement('span')
        setHeaderExtraHost(ctx, headerHost)
        const onBack = vi.fn()
        const host = document.createElement('div')

        serverModeDriveUploader(ctx, { provider: 'google-drive', onBack })
        await settle()
        render(
            serverModeDriveUploader(ctx, { provider: 'google-drive', onBack }),
            host,
        )

        const logout = headerHost.querySelector('button')
        expect(logout?.textContent?.trim()).toBe('Log out')
        logout!.click()
        await settle()

        expect(
            calls.filter(
                c =>
                    c.method === 'POST' &&
                    c.url ===
                        'http://localhost:53060/files/google-drive/logout',
            ),
        ).toHaveLength(1)
        expect(ctx.setActiveSource).toHaveBeenCalledWith(undefined)
        expect(open).not.toHaveBeenCalled()
        destroyServerDrives(ctx)
    })

    it('a failed transfer stays in the view: error shown, list kept, no onBack', async () => {
        stubDrive({ transferStatus: 500 })
        const ctx = makeCtx()
        const onBack = vi.fn()
        const host = document.createElement('div')
        const draw = () =>
            render(
                serverModeDriveUploader(ctx, {
                    provider: 'google-drive',
                    onBack,
                }),
                host,
            )

        serverModeDriveUploader(ctx, { provider: 'google-drive', onBack })
        await settle()
        draw()
        ;(
            host.querySelector(
                '[data-upup-slot="drive-browser-item"]',
            ) as HTMLButtonElement
        ).click()
        draw()
        const add = [...host.querySelectorAll('button')].find(b =>
            b.textContent?.includes('Add files'),
        )
        add!.click()
        await settle()
        draw()

        const error = host.querySelector('[data-testid="upup-drive-error"]')
        expect(error?.getAttribute('role')).toBe('alert')
        expect(error?.textContent).toContain('boom')
        expect(
            host.querySelector('[data-upup-slot="drive-browser-item"]'),
        ).not.toBeNull()
        expect(onBack).not.toHaveBeenCalled()
        destroyServerDrives(ctx)
    })

    it('Cancel clears a stale transfer error', async () => {
        stubDrive({ transferStatus: 500 })
        const ctx = makeCtx()
        const onBack = vi.fn()
        const host = document.createElement('div')
        const draw = () =>
            render(
                serverModeDriveUploader(ctx, {
                    provider: 'google-drive',
                    onBack,
                }),
                host,
            )
        const clickButton = (label: string) =>
            [...host.querySelectorAll('button')]
                .find(b => b.textContent?.includes(label))!
                .click()

        serverModeDriveUploader(ctx, { provider: 'google-drive', onBack })
        await settle()
        draw()
        ;(
            host.querySelector(
                '[data-upup-slot="drive-browser-item"]',
            ) as HTMLButtonElement
        ).click()
        draw()
        clickButton('Add files')
        await settle()
        draw()
        expect(
            host.querySelector('[data-testid="upup-drive-error"]'),
        ).not.toBeNull()

        clickButton('Cancel')
        draw()

        expect(onBack).toHaveBeenCalledTimes(1)
        expect(
            host.querySelector('[data-testid="upup-drive-error"]'),
        ).toBeNull()
        destroyServerDrives(ctx)
    })

    it('reports a 2-file selection ONCE with both files (upload-all-complete)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string, init?: { body?: string }) => {
                if (url.endsWith('/transfer')) {
                    const { fileId, fileName } = JSON.parse(init!.body!) as {
                        fileId: string
                        fileName: string
                    }
                    return json(200, {
                        key: `uploads/${fileId}`,
                        name: fileName,
                        size: 3,
                        type: 'text/plain',
                    })
                }
                return json(200, {
                    files: ['a.txt', 'b.txt'].map((name, i) => ({
                        id: `f${i + 1}`,
                        name,
                        isFolder: false,
                        size: 3,
                        mimeType: 'text/plain',
                    })),
                })
            }),
        )
        const core = new UpupCore({})
        const done = vi.fn()
        core.on('upload-all-complete', done)
        const ctx = Object.assign(makeCtx(), { core })
        const onBack = vi.fn()
        const host = document.createElement('div')
        const draw = () =>
            render(
                serverModeDriveUploader(ctx, {
                    provider: 'google-drive',
                    onBack,
                }),
                host,
            )

        serverModeDriveUploader(ctx, { provider: 'google-drive', onBack })
        await settle()
        draw()
        for (const item of Array.from(
            host.querySelectorAll<HTMLButtonElement>(
                '[data-upup-slot="drive-browser-item"]',
            ),
        ))
            item.click()
        draw()
        Array.from(host.querySelectorAll('button'))
            .find(b => b.textContent?.includes('Add files'))!
            .click()
        await settle()

        expect(onBack).toHaveBeenCalledTimes(1)
        expect(done).toHaveBeenCalledTimes(1)
        expect(
            (done.mock.calls[0]![0] as Array<{ key: string }>)
                .map(f => f.key)
                .sort(),
        ).toEqual(['uploads/f1', 'uploads/f2'])
        destroyServerDrives(ctx)
    })
})
