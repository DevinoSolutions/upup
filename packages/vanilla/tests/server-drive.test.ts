import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from 'lit-html'
import {
    serverModeDriveUploader,
    destroyServerDrives,
} from '../src/templates/server-mode-drive-uploader'

// Fresh ctx per test so the module-level per-ctx WeakMap state never bleeds across cases.
function makeCtx(invalidate: () => void) {
    return {
        serverUrl: 'http://localhost:53060',
        theme: { getSnapshot: () => ({ isDark: false, slotOverrides: {} }) },
        translations: {
            authenticatePrompt: 'Sign in to {{provider}}',
            signInWith: 'Sign in with {{provider}}',
        },
        invalidate,
    } as Parameters<typeof serverModeDriveUploader>[0]
}
const flush = async () => {
    await Promise.resolve()
    await Promise.resolve()
}

beforeEach(() => {
    vi.restoreAllMocks()
})

describe('serverModeDriveUploader', () => {
    it('returns a template result and lists files from serverUrl', async () => {
        const invalidate = vi.fn()
        const ctx = makeCtx(invalidate)
        vi.stubGlobal(
            'fetch',
            vi.fn(
                async () =>
                    new Response(
                        JSON.stringify({
                            files: [
                                {
                                    id: '1',
                                    name: 'a.txt',
                                    isFolder: false,
                                    size: 3,
                                },
                            ],
                        }),
                        { status: 200 },
                    ),
            ),
        )
        const tpl = serverModeDriveUploader(ctx, {
            provider: 'google-drive',
            onBack: () => {},
        })
        expect(tpl).toBeTruthy()
        await flush()
        expect(invalidate).toHaveBeenCalled()
        vi.unstubAllGlobals()
    })

    it('routes a 401 from list to the re-auth sign-in fallback (not the browser)', async () => {
        const invalidate = vi.fn()
        const ctx = makeCtx(invalidate)
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('', { status: 401 })),
        )
        serverModeDriveUploader(ctx, {
            provider: 'google-drive',
            onBack: () => {},
        }) // kicks the lazy list()
        await flush()
        const host = document.createElement('div')
        render(
            serverModeDriveUploader(ctx, {
                provider: 'google-drive',
                onBack: () => {},
            }),
            host,
        )
        expect(
            host.querySelector('[data-testid="upup-server-drive-browser"]'),
        ).toBeNull()
        expect(host.textContent).toContain('Sign in with Google Drive')
        vi.unstubAllGlobals()
    })

    it('destroyServerDrives aborts the in-flight list request', async () => {
        const invalidate = vi.fn()
        const ctx = makeCtx(invalidate)
        let captured: AbortSignal | undefined
        vi.stubGlobal(
            'fetch',
            vi.fn((_url: string, init: RequestInit) => {
                captured = init.signal as AbortSignal
                return new Promise<Response>(() => {})
            }),
        )
        serverModeDriveUploader(ctx, {
            provider: 'google-drive',
            onBack: () => {},
        })
        await flush()
        expect(captured).toBeTruthy()
        expect(captured!.aborted).toBe(false)
        destroyServerDrives(ctx)
        expect(captured!.aborted).toBe(true)
        vi.unstubAllGlobals()
    })

    it('destroyServerDrives removes the window message listener armed by re-auth (leak-fix regression guard)', async () => {
        const invalidate = vi.fn()
        const ctx = makeCtx(invalidate)
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('', { status: 401 })),
        )
        vi.spyOn(window, 'open').mockReturnValue({
            closed: false,
        } as unknown as Window)
        const addSpy = vi.spyOn(window, 'addEventListener')
        const removeSpy = vi.spyOn(window, 'removeEventListener')
        serverModeDriveUploader(ctx, {
            provider: 'google-drive',
            onBack: () => {},
        })
        await flush()
        const host = document.createElement('div')
        render(
            serverModeDriveUploader(ctx, {
                provider: 'google-drive',
                onBack: () => {},
            }),
            host,
        )
        ;(host.querySelector('button') as HTMLButtonElement).click() // onRetry -> startAuth -> window.open + addEventListener('message')
        const msgAdd = addSpy.mock.calls.find(([type]) => type === 'message')
        expect(msgAdd).toBeTruthy()
        const handler = msgAdd![1]
        destroyServerDrives(ctx)
        expect(removeSpy).toHaveBeenCalledWith('message', handler)
        vi.unstubAllGlobals()
    })
})
