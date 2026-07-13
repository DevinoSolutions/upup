import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DirectUpload } from '../../src/strategies/direct-upload'
import { UpupNetworkError, UpupStorageError, UpupError } from '@useupup/core'

// ─────────────────────────────────────────────
// Fake XHR factory
// ─────────────────────────────────────────────
function makeFakeXhr(statusCode = 200, statusText = 'OK') {
    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {}
    const uploadListeners: Record<string, ((...args: unknown[]) => void)[]> = {}

    const xhr = {
        status: statusCode,
        statusText,
        responseText: '{}',
        open: vi.fn(),
        setRequestHeader: vi.fn(),
        send: vi.fn(),
        abort: vi.fn(),
        upload: {
            addEventListener: vi.fn(
                (event: string, cb: (...args: unknown[]) => void) => {
                    uploadListeners[event] = uploadListeners[event] ?? []
                    uploadListeners[event].push(cb)
                },
            ),
        },
        addEventListener: vi.fn(
            (event: string, cb: (...args: unknown[]) => void) => {
                listeners[event] = listeners[event] ?? []
                listeners[event].push(cb)
            },
        ),
        // helpers to trigger events in tests
        _triggerLoad: () => listeners['load']?.forEach(cb => cb()),
        _triggerError: () => listeners['error']?.forEach(cb => cb()),
        _triggerAbort: () => listeners['abort']?.forEach(cb => cb()),
        _triggerProgress: (loaded: number, total: number) =>
            uploadListeners['progress']?.forEach(cb =>
                cb({ lengthComputable: true, loaded, total }),
            ),
    }
    return xhr
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function makeAbortController() {
    return new AbortController()
}

const FILE = new File(['hello'], 'hello.txt', { type: 'text/plain' })
const CREDENTIALS = {
    uploadUrl: 'https://s3.example.com/upload',
    key: 'uploads/hello.txt',
    expiresIn: 3600,
}

// ─────────────────────────────────────────────
// Constructor / shape
// ─────────────────────────────────────────────
describe('DirectUpload — shape', () => {
    it('instantiates without throwing', () => {
        expect(() => new DirectUpload()).not.toThrow()
    })

    it('has an upload method', () => {
        expect(typeof new DirectUpload().upload).toBe('function')
    })
})

// ─────────────────────────────────────────────
// Success path
// ─────────────────────────────────────────────
describe('DirectUpload — success', () => {
    let fakeXhr: ReturnType<typeof makeFakeXhr>

    beforeEach(() => {
        fakeXhr = makeFakeXhr(200, 'OK')
        // Must use a regular function (not arrow) so vitest accepts it as a constructor.
        // Returning the object from a constructor causes `new` to use that object.
        vi.stubGlobal('XMLHttpRequest', function () {
            return fakeXhr
        })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('resolves with the credentials key', async () => {
        const controller = makeAbortController()
        const uploader = new DirectUpload()
        const promise = uploader.upload(FILE, CREDENTIALS, {
            onProgress: vi.fn(),
            signal: controller.signal,
        })
        fakeXhr._triggerLoad()
        const result = await promise
        expect(result.key).toBe('uploads/hello.txt')
    })

    it('resolves with the credentials publicUrl when present', async () => {
        const controller = makeAbortController()
        const creds = {
            ...CREDENTIALS,
            publicUrl: 'https://cdn.example.com/hello.txt',
        }
        const uploader = new DirectUpload()
        const promise = uploader.upload(FILE, creds, {
            onProgress: vi.fn(),
            signal: controller.signal,
        })
        fakeXhr._triggerLoad()
        const result = await promise
        expect(result.publicUrl).toBe('https://cdn.example.com/hello.txt')
    })

    it('sends signed upload headers when present', async () => {
        const controller = makeAbortController()
        const creds = {
            ...CREDENTIALS,
            uploadHeaders: {
                'Content-Type': 'text/plain',
                'x-amz-meta-test': 'yes',
            },
        }
        const uploader = new DirectUpload()
        const promise = uploader.upload(FILE, creds, {
            onProgress: vi.fn(),
            signal: controller.signal,
        })
        fakeXhr._triggerLoad()
        await promise
        expect(fakeXhr.setRequestHeader).toHaveBeenCalledWith(
            'Content-Type',
            'text/plain',
        )
        expect(fakeXhr.setRequestHeader).toHaveBeenCalledWith(
            'x-amz-meta-test',
            'yes',
        )
    })

    it('calls onProgress when XHR upload progress fires', async () => {
        const controller = makeAbortController()
        const onProgress = vi.fn()
        const uploader = new DirectUpload()
        const promise = uploader.upload(FILE, CREDENTIALS, {
            onProgress,
            signal: controller.signal,
        })
        fakeXhr._triggerProgress(512, 1024)
        fakeXhr._triggerLoad()
        await promise
        expect(onProgress).toHaveBeenCalledWith(512, 1024)
    })

    it('does not call onProgress for non-computable progress events', async () => {
        const controller = makeAbortController()
        const onProgress = vi.fn()
        const uploader = new DirectUpload()
        const promise = uploader.upload(FILE, CREDENTIALS, {
            onProgress,
            signal: controller.signal,
        })
        // Fire a non-computable event manually
        fakeXhr.upload.addEventListener.mock.calls
            .filter(([ev]) => ev === 'progress')
            .forEach(([, cb]) =>
                cb({ lengthComputable: false, loaded: 0, total: 0 }),
            )
        fakeXhr._triggerLoad()
        await promise
        expect(onProgress).not.toHaveBeenCalled()
    })
})

// ─────────────────────────────────────────────
// Error path — HTTP error status
// ─────────────────────────────────────────────
describe('DirectUpload — HTTP error', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('rejects with a typed UpupStorageError on 4xx status (P4/C6: was UpupNetworkError, now carries provider/operation/code)', async () => {
        const fakeXhr = makeFakeXhr(403, 'Forbidden')
        vi.stubGlobal('XMLHttpRequest', function () {
            return fakeXhr
        })

        const controller = makeAbortController()
        const uploader = new DirectUpload()
        const promise = uploader.upload(FILE, CREDENTIALS, {
            onProgress: vi.fn(),
            signal: controller.signal,
        })
        fakeXhr._triggerLoad()
        await expect(promise).rejects.toBeInstanceOf(UpupError)
        await expect(promise).rejects.toBeInstanceOf(UpupStorageError)
    })

    it('rejects with a typed UpupStorageError on 5xx status (P4/C6: was UpupNetworkError, now carries provider/operation/code)', async () => {
        const fakeXhr = makeFakeXhr(500, 'Internal Server Error')
        vi.stubGlobal('XMLHttpRequest', function () {
            return fakeXhr
        })

        const controller = makeAbortController()
        const uploader = new DirectUpload()
        const promise = uploader.upload(FILE, CREDENTIALS, {
            onProgress: vi.fn(),
            signal: controller.signal,
        })
        fakeXhr._triggerLoad()
        await expect(promise).rejects.toBeInstanceOf(UpupError)
        await expect(promise).rejects.toBeInstanceOf(UpupStorageError)
    })

    it('includes the status code in the thrown error', async () => {
        const fakeXhr = makeFakeXhr(422, 'Unprocessable Entity')
        vi.stubGlobal('XMLHttpRequest', function () {
            return fakeXhr
        })

        const controller = makeAbortController()
        const uploader = new DirectUpload()
        const promise = uploader.upload(FILE, CREDENTIALS, {
            onProgress: vi.fn(),
            signal: controller.signal,
        })
        fakeXhr._triggerLoad()
        const err = await promise.catch(e => e)
        expect(err.status).toBe(422)
    })

    it('reads the response body and surfaces the server code (P4/C6)', async () => {
        const fakeXhr = makeFakeXhr(403, 'Forbidden')
        fakeXhr.responseText = JSON.stringify({
            error: 'Signature mismatch',
            code: 'SignatureDoesNotMatch',
        })
        vi.stubGlobal('XMLHttpRequest', function () {
            return fakeXhr
        })

        const controller = makeAbortController()
        const uploader = new DirectUpload()
        const promise = uploader.upload(FILE, CREDENTIALS, {
            onProgress: vi.fn(),
            signal: controller.signal,
        })
        fakeXhr._triggerLoad()
        const err = await promise.catch(e => e)
        expect(err.code).toBe('SignatureDoesNotMatch')
    })
})

// ─────────────────────────────────────────────
// Error path — network / abort
// ─────────────────────────────────────────────
describe('DirectUpload — network error and abort', () => {
    let fakeXhr: ReturnType<typeof makeFakeXhr>

    beforeEach(() => {
        fakeXhr = makeFakeXhr(0, '')
        vi.stubGlobal('XMLHttpRequest', function () {
            return fakeXhr
        })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('rejects with UpupNetworkError on XHR error event', async () => {
        const controller = makeAbortController()
        const uploader = new DirectUpload()
        const promise = uploader.upload(FILE, CREDENTIALS, {
            onProgress: vi.fn(),
            signal: controller.signal,
        })
        fakeXhr._triggerError()
        await expect(promise).rejects.toBeInstanceOf(UpupNetworkError)
    })

    it('rejects with UpupNetworkError on XHR abort event', async () => {
        const controller = makeAbortController()
        const uploader = new DirectUpload()
        const promise = uploader.upload(FILE, CREDENTIALS, {
            onProgress: vi.fn(),
            signal: controller.signal,
        })
        fakeXhr._triggerAbort()
        await expect(promise).rejects.toBeInstanceOf(UpupNetworkError)
    })

    it('calls xhr.abort() when AbortSignal is triggered', async () => {
        const controller = makeAbortController()
        const uploader = new DirectUpload()
        uploader.upload(FILE, CREDENTIALS, {
            onProgress: vi.fn(),
            signal: controller.signal,
        })
        controller.abort()
        // Give the signal handler time to run
        await new Promise(r => setTimeout(r, 0))
        expect(fakeXhr.abort).toHaveBeenCalled()
    })
})
