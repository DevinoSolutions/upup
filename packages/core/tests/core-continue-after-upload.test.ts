import { afterEach, describe, it, expect, vi } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@upupjs/core'

/**
 * F-810 continue-after-upload: after a run reaches a terminal status, adding
 * fresh files must (a) return the run to IDLE so the upload CTA reappears and
 * (b) upload ONLY the still-pending files — never re-PUT an already-successful
 * one. These tests drive a real upload against a mocked presign + XHR PUT.
 */

/** Presign responder — every file resolves to a distinct key so `f.key` is set. */
function stubPresign() {
    let n = 0
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
            n += 1
            return new Response(
                JSON.stringify({
                    key: `uploads/file-${n}.bin`,
                    uploadUrl: `https://storage.example/file-${n}.bin`,
                    publicUrl: `https://cdn.example/file-${n}.bin`,
                    expiresIn: 3600,
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                },
            )
        }),
    )
}

/** A fresh auto-completing XHR per construction; records each PUT body's name. */
function stubAutoXhr(onSend: (name: string) => void) {
    vi.stubGlobal('XMLHttpRequest', function (this: unknown) {
        const listeners: Record<string, Array<() => void>> = {}
        return {
            status: 200,
            statusText: 'OK',
            open: vi.fn(),
            setRequestHeader: vi.fn(),
            send: vi.fn((body: unknown) => {
                if (body instanceof File) onSend(body.name)
                queueMicrotask(() =>
                    listeners.load?.forEach(cb => {
                        cb()
                    }),
                )
            }),
            abort: vi.fn(),
            upload: { addEventListener: vi.fn() },
            addEventListener: vi.fn((event: string, cb: () => void) => {
                listeners[event] = listeners[event] ?? []
                listeners[event].push(cb)
            }),
        }
    })
}

const txt = (name: string) =>
    new File([`data-${name}`], name, { type: 'text/plain' })

describe('UpupCore — continue after upload (F-810)', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('returns to IDLE when new pending files are added after a successful run', async () => {
        stubPresign()
        stubAutoXhr(() => {})
        const core = new UpupCore({
            uploadEndpoint: '/api/presign',
            maxRetries: 0,
        })
        await core.addFiles([txt('a.txt')])
        await core.upload()
        expect(core.status).toBe(UploadStatus.SUCCESSFUL)

        await core.addFiles([txt('b.txt')])
        // CTA-visibility hinge: a terminal run flips back to IDLE on new files.
        expect(core.status).toBe(UploadStatus.IDLE)

        // The already-completed file keeps its key; the new one is still pending.
        const a = [...core.files.values()].find(f => f.name === 'a.txt')
        const b = [...core.files.values()].find(f => f.name === 'b.txt')
        expect(a?.key).toBeTruthy()
        expect(b?.key ?? null).toBeNull()
        core.destroy()
    })

    it('a second upload() re-sends only the pending files, not the successful ones', async () => {
        stubPresign()
        const sent: string[] = []
        stubAutoXhr(name => sent.push(name))
        const core = new UpupCore({
            uploadEndpoint: '/api/presign',
            maxRetries: 0,
        })

        await core.addFiles([txt('a.txt')])
        await core.upload()
        expect(sent).toEqual(['a.txt'])

        await core.addFiles([txt('b.txt')])
        await core.upload()

        // a.txt already succeeded: it must NOT be PUT a second time.
        expect(sent.filter(n => n === 'a.txt').length).toBe(1)
        expect(sent.filter(n => n === 'b.txt').length).toBe(1)
        expect(core.status).toBe(UploadStatus.SUCCESSFUL)
        core.destroy()
    })

    it('does not reset a terminal status when addFiles adds nothing new', async () => {
        stubPresign()
        stubAutoXhr(() => {})
        const core = new UpupCore({
            uploadEndpoint: '/api/presign',
            maxRetries: 0,
            limit: 1,
        })
        await core.addFiles([txt('a.txt')])
        await core.upload()
        expect(core.status).toBe(UploadStatus.SUCCESSFUL)

        // Over-limit add is rejected → no new pending files → status unchanged.
        await core.addFiles([txt('b.txt')]).catch(() => undefined)
        expect(core.status).toBe(UploadStatus.SUCCESSFUL)
        core.destroy()
    })
})
