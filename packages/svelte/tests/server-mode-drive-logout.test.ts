import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'

// Log out (T-6093): clicking the control portalled into the SourceView header
// row POSTs /files/:provider/logout, returns to the source selector, and never
// opens the OAuth popup. Context hooks are mocked; the controller is real.
const ctx = vi.hoisted(() => ({
    setActiveSource: undefined as unknown as ReturnType<typeof vi.fn>,
    headerHost: undefined as unknown as HTMLElement,
}))

vi.mock('../src/context/uploader-context', async () => {
    const { writable } = await import('svelte/store')
    return {
        useUploaderRuntime: () => ({
            serverUrl: 'http://localhost:9999',
            core: undefined,
        }),
        useUploaderOptions: () => ({
            icons: { LoaderIcon: () => null },
        }),
        useUploaderTheme: () => ({
            isDark: writable(false),
            slotOverrides: writable({}),
        }),
        useUploaderI18n: () => ({
            translator: undefined,
            translations: {
                logOut: 'Log out',
                authenticatePrompt: 'Sign in to {{provider}}',
                signInWith: 'Sign in with {{provider}}',
            },
        }),
        useUploaderSource: () => ({
            setActiveSource: ctx.setActiveSource,
        }),
    }
})

vi.mock('../src/context/source-view-header-extra', async () => {
    const actual = await vi.importActual<
        typeof import('../src/context/source-view-header-extra')
    >('../src/context/source-view-header-extra')
    const { writable } = await import('svelte/store')
    return {
        ...actual,
        useSourceViewHeaderExtra: () => writable(ctx.headerHost),
    }
})

import ServerModeDriveUploader from '../src/components/ServerModeDriveUploader.svelte'

const jsonRes = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

describe('ServerModeDriveUploader (svelte) - Log out', () => {
    it('POSTs /files/:provider/logout, returns to the selector and never opens the OAuth popup', async () => {
        const calls: Array<{ url: string; method: string }> = []
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string, init?: { method?: string }) => {
                calls.push({ url, method: init?.method ?? 'GET' })
                if (url.endsWith('/logout')) return jsonRes(200, { ok: true })
                return jsonRes(200, {
                    files: [{ id: '1', name: 'a.txt', isFolder: false }],
                })
            }),
        )
        const open = vi.spyOn(window, 'open').mockReturnValue(null)
        ctx.setActiveSource = vi.fn()
        ctx.headerHost = document.createElement('span')
        document.body.appendChild(ctx.headerHost)

        const { container } = render(ServerModeDriveUploader, {
            provider: 'google-drive',
        })

        await vi.waitFor(() => {
            expect(
                container.querySelector(
                    '[data-testid="upup-server-drive-browser"]',
                ),
            ).not.toBeNull()
            expect(ctx.headerHost.querySelector('button')).not.toBeNull()
        })
        const logout = ctx.headerHost.querySelector('button')!
        expect(logout.textContent?.trim()).toBe('Log out')
        logout.click()

        await vi.waitFor(() => {
            expect(ctx.setActiveSource).toHaveBeenCalledWith(undefined)
        })
        expect(
            calls.filter(
                c =>
                    c.method === 'POST' &&
                    c.url === 'http://localhost:9999/files/google-drive/logout',
            ),
        ).toHaveLength(1)
        expect(open).not.toHaveBeenCalled()
    })

    it('a failed transfer stays in the view: error shown, list kept, no onBack', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                if (url.endsWith('/transfer'))
                    return jsonRes(500, { error: 'boom' })
                return jsonRes(200, {
                    files: [{ id: '1', name: 'a.txt', isFolder: false }],
                })
            }),
        )
        ctx.setActiveSource = vi.fn()
        ctx.headerHost = document.createElement('span')
        const onBack = vi.fn()

        const { container } = render(ServerModeDriveUploader, {
            provider: 'google-drive',
            onBack,
        })

        await vi.waitFor(() => {
            expect(
                container.querySelector(
                    '[data-upup-slot="drive-browser-item"]',
                ),
            ).not.toBeNull()
        })
        container
            .querySelector<HTMLButtonElement>(
                '[data-upup-slot="drive-browser-item"]',
            )!
            .click()
        await vi.waitFor(() => {
            const add = Array.from(container.querySelectorAll('button')).find(
                b => b.textContent?.includes('Add files'),
            )
            expect(add?.disabled).toBe(false)
        })
        Array.from(container.querySelectorAll('button'))
            .find(b => b.textContent?.includes('Add files'))!
            .click()

        await vi.waitFor(() => {
            const error = container.querySelector(
                '[data-testid="upup-drive-error"]',
            )
            expect(error?.getAttribute('role')).toBe('alert')
            expect(error?.textContent).toContain('boom')
        })
        expect(
            container.querySelector('[data-upup-slot="drive-browser-item"]'),
        ).not.toBeNull()
        expect(onBack).not.toHaveBeenCalled()
    })
})
