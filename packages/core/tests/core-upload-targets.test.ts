import { afterEach, describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'

function makeUploadXhr(captureBody: (body: unknown) => void) {
    const listeners: Record<string, Array<() => void>> = {}
    return {
        status: 200,
        statusText: 'OK',
        open: vi.fn(),
        setRequestHeader: vi.fn(),
        send: vi.fn((body: unknown) => {
            captureBody(body)
        }),
        abort: vi.fn(() => listeners.abort?.forEach(cb => cb())),
        upload: {
            addEventListener: vi.fn(),
        },
        addEventListener: vi.fn((event: string, cb: () => void) => {
            listeners[event] = listeners[event] ?? []
            listeners[event].push(cb)
        }),
        triggerLoad: () => listeners.load?.forEach(cb => cb()),
    }
}

describe('UpupCore upload target resolution', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('keeps local-only selection valid but rejects upload without a target', async () => {
        const core = new UpupCore({})
        await core.addFiles([
            new File(['hello'], 'hello.txt', { type: 'text/plain' }),
        ])

        expect(core.files.size).toBe(1)
        await expect(core.upload()).rejects.toMatchObject({
            name: 'UpupConfigError',
            code: 'NO_UPLOAD_TARGET',
        })
    })

    it('rejects ambiguous upload targets', async () => {
        const core = new UpupCore({
            uploadEndpoint: '/api/presign',
            serverUrl: '/api/upup',
        })
        await core.addFiles([
            new File(['hello'], 'hello.txt', { type: 'text/plain' }),
        ])

        await expect(core.upload()).rejects.toMatchObject({
            name: 'UpupConfigError',
            code: 'AMBIGUOUS_UPLOAD_TARGET',
        })
    })

    it('preserves the native File data through upload status transitions', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(
                async () =>
                    new Response(
                        JSON.stringify({
                            key: 'uploads/hello.txt',
                            uploadUrl: 'https://storage.example/hello.txt',
                            publicUrl: 'https://cdn.example/hello.txt',
                            expiresIn: 3600,
                        }),
                        {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' },
                        },
                    ),
            ),
        )

        let sentBody: unknown
        const xhr = makeUploadXhr(body => {
            sentBody = body
        })
        vi.stubGlobal('XMLHttpRequest', function () {
            return xhr
        })

        const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
        const core = new UpupCore({ uploadEndpoint: '/api/presign' })
        await core.addFiles([file])

        const uploadPromise = core.upload()
        await vi.waitFor(() => {
            expect(xhr.send).toHaveBeenCalled()
        })
        xhr.triggerLoad()
        await uploadPromise

        // Status transitions are immutable (F-144): each yields a NEW File reference, so the
        // uploaded body is no longer the exact object added — but it MUST remain a real File
        // carrying the same name and bytes (a plain-object clone would break xhr.send).
        expect(sentBody).toBeInstanceOf(File)
        const sent = sentBody as File
        expect(sent.name).toBe(file.name)
        expect(await sent.text()).toBe('hello')
        expect(core.files.values().next().value).toBeInstanceOf(File)
    })

    it('does not resurrect files after cancel and removeAll during an active upload', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(
                async () =>
                    new Response(
                        JSON.stringify({
                            key: 'uploads/cancelled.txt',
                            uploadUrl: 'https://storage.example/cancelled.txt',
                            publicUrl: 'https://cdn.example/cancelled.txt',
                            expiresIn: 3600,
                        }),
                        {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' },
                        },
                    ),
            ),
        )

        const xhr = makeUploadXhr(() => {})
        vi.stubGlobal('XMLHttpRequest', function () {
            return xhr
        })

        const core = new UpupCore({
            uploadEndpoint: '/api/presign',
            maxRetries: 0,
        })
        await core.addFiles([
            new File(['hello'], 'cancelled.txt', { type: 'text/plain' }),
        ])

        const uploadPromise = core.upload()
        await vi.waitFor(() => {
            expect(xhr.send).toHaveBeenCalled()
        })

        core.cancel()
        core.removeAll()
        expect(xhr.abort).toHaveBeenCalled()
        expect(core.files.size).toBe(0)

        await uploadPromise
        expect(core.files.size).toBe(0)
        core.destroy()
    })
})
