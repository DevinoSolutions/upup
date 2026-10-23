import { describe, it, expect, vi, afterEach } from 'vitest'
import { createApp, ref, type App } from 'vue'

// Log out (T-6093): clicking the control portalled into the SourceView header
// row POSTs /files/:provider/logout, returns to the source selector, and never
// opens the OAuth popup. Context hooks are mocked; the controller is real.
const ctx = vi.hoisted(() => ({
    setActiveSource: undefined as unknown as ReturnType<typeof vi.fn>,
    headerHost: undefined as unknown as HTMLElement,
}))

vi.mock('../src/context/uploader-context', async () => {
    const { ref: r } = await import('vue')
    return {
        useUploaderRuntime: () => ({
            serverUrl: 'http://localhost:9999',
            core: undefined,
        }),
        useUploaderOptions: () => ({
            icons: { LoaderIcon: { render: () => null } },
        }),
        useUploaderTheme: () => ({
            isDark: r(false),
            slotOverrides: r({}),
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

vi.mock('../src/context/source-view-header-extra', () => ({
    useSourceViewHeaderExtra: () => ref(ctx.headerHost),
}))

import ServerModeDriveUploader from '../src/components/ServerModeDriveUploader.vue'

const jsonRes = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })

let app: App | undefined
afterEach(() => {
    app?.unmount()
    app = undefined
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

describe('ServerModeDriveUploader (vue) - Log out', () => {
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
        const root = document.createElement('div')
        document.body.appendChild(root)

        app = createApp(ServerModeDriveUploader, { provider: 'google-drive' })
        app.mount(root)

        await vi.waitFor(() => {
            expect(
                root.querySelector('[data-testid="upup-server-drive-browser"]'),
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
})
