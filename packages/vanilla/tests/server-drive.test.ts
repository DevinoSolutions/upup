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
        // The error snapshot the controller emits on an app-auth 401 carries a
        // machine code, which the template localizes via ctx.translator.
        translator: (key: string) => key,
        invalidate,
    } as Parameters<typeof serverModeDriveUploader>[0]
}
const flush = async () => {
    await Promise.resolve()
    await Promise.resolve()
}
// Drain micro- AND macro-tasks so the controller's async list() chain
// (fetch -> Response.clone().json() -> setState) fully settles before we assert.
// A real jsdom Response body read spans more than the two microtasks `flush` covers.
const settle = async () => {
    for (let i = 0; i < 10; i++) {
        await Promise.resolve()
        await new Promise(resolve => setTimeout(resolve, 0))
    }
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

    it('routes a drive-reauth 401 ({reauth:true}) from list to the re-auth sign-in fallback (not the browser)', async () => {
        const invalidate = vi.fn()
        const ctx = makeCtx(invalidate)
        // A drive-token 401 is signalled by the server with {reauth:true} on the body;
        // ServerModeDriveController maps only that to the reauth view (F-427/C8).
        vi.stubGlobal(
            'fetch',
            vi.fn(
                async () =>
                    new Response(JSON.stringify({ reauth: true }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' },
                    }),
            ),
        )
        serverModeDriveUploader(ctx, {
            provider: 'google-drive',
            onBack: () => {},
        }) // kicks the lazy list()
        await settle()
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

    it('routes an app-auth 401 (no reauth flag) from list to the error view, NOT the reauth fallback (F-706 fail-closed)', async () => {
        const invalidate = vi.fn()
        const ctx = makeCtx(invalidate)
        // An app-level 401 (config.auth denied the request — no {reauth:true}) must NOT
        // show the reconnect prompt. Vanilla used to fail open here (unconditional
        // 401->reauth); routing through the controller fails closed to the error view.
        vi.stubGlobal(
            'fetch',
            vi.fn(
                async () =>
                    new Response(JSON.stringify({ error: 'Unauthorized' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' },
                    }),
            ),
        )
        serverModeDriveUploader(ctx, {
            provider: 'google-drive',
            onBack: () => {},
        }) // kicks the lazy list()
        await settle()
        const host = document.createElement('div')
        render(
            serverModeDriveUploader(ctx, {
                provider: 'google-drive',
                onBack: () => {},
            }),
            host,
        )
        // Browser stays mounted with the error snapshot rendered inside it...
        expect(
            host.querySelector('[data-testid="upup-server-drive-browser"]'),
        ).not.toBeNull()
        expect(
            host.querySelector('[data-testid="upup-drive-error"]'),
        ).not.toBeNull()
        // ...and the reauth sign-in fallback is NOT shown.
        expect(host.textContent).not.toContain('Sign in with Google Drive')
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
            vi.fn(
                async () =>
                    new Response(JSON.stringify({ reauth: true }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' },
                    }),
            ),
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
        await settle()
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
