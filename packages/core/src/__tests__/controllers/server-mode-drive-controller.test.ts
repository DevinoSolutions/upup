import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ServerModeDriveController } from '../../controllers/server-mode-drive-controller'

const SERVER = 'http://localhost:9999'

function ctrl(serverUrl: string | undefined = SERVER) {
    return new ServerModeDriveController({
        provider: 'google-drive',
        serverUrl: () => serverUrl,
    })
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

describe('ServerModeDriveController', () => {
    it('list() happy path → ready with files', async () => {
        const files = [{ id: '1', name: 'a', isFolder: false }]
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                status: 200,
                ok: true,
                json: async () => ({ files }),
            }),
        )
        const c = ctrl()
        await c.list()
        expect(c.getSnapshot().state).toEqual({ status: 'ready', files })
    })

    it('list() 401 with {reauth:true} body → reauth', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                status: 401,
                ok: false,
                clone: function () {
                    return this
                },
                json: async () => ({ reauth: true, provider: 'google-drive' }),
            }),
        )
        const c = ctrl()
        await c.list()
        expect(c.getSnapshot().state).toEqual({ status: 'reauth' })
    })

    it('list() 401 with a plain app-auth body (no reauth flag) → error, NOT reauth (P4/C8, F-427)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                status: 401,
                ok: false,
                clone: function () {
                    return this
                },
                json: async () => ({ error: 'Unauthorized' }),
            }),
        )
        const c = ctrl()
        await c.list()
        expect(c.getSnapshot().state).toEqual({
            status: 'error',
            message: 'Unauthorized',
            code: 'UNAUTHENTICATED',
        })
    })

    it('list() 401 with an unparsable body → error, NOT reauth (fails closed, not open)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                status: 401,
                ok: false,
                clone: function () {
                    return this
                },
                json: async () => {
                    throw new Error('not json')
                },
            }),
        )
        const c = ctrl()
        await c.list()
        expect(c.getSnapshot().state.status).toBe('error')
        expect((c.getSnapshot().state as { code?: string }).code).toBe(
            'UNAUTHENTICATED',
        )
    })

    it('list() network error → error', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))
        const c = ctrl()
        await c.list()
        expect(c.getSnapshot().state).toEqual({
            status: 'error',
            message: 'boom',
        })
    })

    it('list() with no serverUrl → error', async () => {
        const c = ctrl(undefined)
        await c.list()
        expect(c.getSnapshot().state.status).toBe('error')
    })

    it('transfer() ok returns {status:ok} without mutating list state', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                status: 200,
                ok: true,
                json: async () => ({ file: {} }),
            }),
        )
        const c = ctrl()
        const before = c.getSnapshot().state
        const r = await c.transfer({ id: '1', name: 'a', isFolder: false })
        expect(r.status).toBe('ok')
        expect(c.getSnapshot().state).toBe(before) // unchanged ref
    })

    it('transfer() 401 with {reauth:true} body → {status:reauth}, no state mutation', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                status: 401,
                ok: false,
                clone: function () {
                    return this
                },
                json: async () => ({ reauth: true, provider: 'google-drive' }),
            }),
        )
        const c = ctrl()
        const r = await c.transfer({ id: '1', name: 'a', isFolder: false })
        expect(r).toEqual({ status: 'reauth' })
        expect(c.getSnapshot().state.status).toBe('idle')
    })

    it('transfer() 401 with a plain app-auth body → {status:error, code:UNAUTHENTICATED}, NOT reauth (P4/C8, F-427)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                status: 401,
                ok: false,
                clone: function () {
                    return this
                },
                json: async () => ({ error: 'Unauthorized' }),
            }),
        )
        const c = ctrl()
        const r = await c.transfer({ id: '1', name: 'a', isFolder: false })
        expect(r).toEqual({
            status: 'error',
            message: 'Unauthorized',
            code: 'UNAUTHENTICATED',
        })
    })

    it('setFolderId/setSearch update snapshot but do NOT auto-list', () => {
        const fetchSpy = vi.fn()
        vi.stubGlobal('fetch', fetchSpy)
        const c = ctrl()
        c.setFolderId('folder-1')
        c.setSearch('q')
        expect(c.getSnapshot().folderId).toBe('folder-1')
        expect(c.getSnapshot().search).toBe('q')
        expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('requestReauth()/setError() force the view', () => {
        const c = ctrl()
        c.requestReauth()
        expect(c.getSnapshot().state).toEqual({ status: 'reauth' })
        c.setError('nope')
        expect(c.getSnapshot().state).toEqual({
            status: 'error',
            message: 'nope',
        })
    })

    it('getSnapshot is referentially stable until a change', () => {
        const c = ctrl()
        const a = c.getSnapshot()
        expect(c.getSnapshot()).toBe(a)
        c.setSearch('x')
        expect(c.getSnapshot()).not.toBe(a)
    })

    it('startAuth opens a popup, arms a message listener, refreshes on success', async () => {
        const fetchSpy = vi.fn().mockResolvedValue({
            status: 200,
            ok: true,
            json: async () => ({ files: [] }),
        })
        vi.stubGlobal('fetch', fetchSpy)
        let handler: ((e: any) => void) | null = null
        vi.stubGlobal('window', {
            open: vi.fn().mockReturnValue({}),
            addEventListener: vi.fn((_: string, h: any) => {
                handler = h
            }),
            removeEventListener: vi.fn(),
        })
        const c = ctrl()
        c.startAuth()
        expect((window as any).open).toHaveBeenCalled()
        handler!({
            data: { type: 'upup:oauth-success', provider: 'google-drive' },
        })
        await Promise.resolve()
        expect(fetchSpy).toHaveBeenCalled()
    })

    it('destroy aborts an in-flight list and removes the message listener', async () => {
        const removeSpy = vi.fn()
        vi.stubGlobal('window', {
            open: vi.fn().mockReturnValue({}),
            addEventListener: vi.fn(),
            removeEventListener: removeSpy,
        })
        vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {}))) // never resolves
        const c = ctrl()
        c.startAuth()
        void c.list()
        c.destroy()
        expect(removeSpy).toHaveBeenCalled()
    })
})
