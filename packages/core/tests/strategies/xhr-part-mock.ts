// Shared XMLHttpRequest stand-in for MultipartUpload's part PUTs.
//
// MultipartUpload PUTs each part over XHR (mirroring direct-upload.ts) so its
// stall watchdog can be an INACTIVITY timer driven by upload-progress events
// rather than a flat ceiling on total upload time. A `fetch` mock therefore no
// longer sees the part uploads, and every suite that used to drive the PUT
// through `vi.stubGlobal('fetch', ...)` drives it through this instead.
//
// The lifecycle mirrors the fetch mock it replaces: install once at module
// scope, reset the responder in `beforeEach`. The `puts` handle is a plain
// vi.fn — `.mockImplementation` / `.mockResolvedValue` and `toHaveBeenCalled…`
// work exactly as they did against the old `mockFetch`.

import { vi, type Mock } from 'vitest'

export interface PartRequest {
    method: string
    url: string
    headers: Record<string, string>
    body: unknown
}

export interface PartResponse {
    status: number
    statusText?: string
    /** Response headers — notably `ETag`, read case-insensitively. */
    headers?: Record<string, string>
    responseText?: string
}

/**
 * The vi.fn the strategy's PUT invokes. It receives the request and a
 * `progress` emitter: calling `progress()` fires an `upload` progress event,
 * which resets the strategy's inactivity watchdog. Resolve → the PUT `load`s
 * with that response; throw → a network-level `error` (the `TypeError`-shaped
 * failure the retry predicate treats as retryable); return a promise that never
 * settles → the request hangs until the watchdog or the caller's signal aborts
 * it (the stall path).
 */
export type PartResponder = Mock<
    (req: PartRequest, progress: () => void) => Promise<PartResponse>
>

type Listener = () => void

class MockXhrUpload {
    readonly progressListeners: Listener[] = []

    addEventListener(type: string, cb: Listener): void {
        if (type === 'progress') this.progressListeners.push(cb)
    }
}

class MockXhr {
    static responder: PartResponder | undefined

    method = ''
    url = ''
    status = 0
    statusText = ''
    responseText = ''
    readonly upload = new MockXhrUpload()

    private readonly requestHeaders: Record<string, string> = {}
    private responseHeaders: Record<string, string> = {}
    private readonly listeners = new Map<string, Listener[]>()
    private settled = false

    addEventListener(type: string, cb: Listener): void {
        const list = this.listeners.get(type) ?? []
        list.push(cb)
        this.listeners.set(type, list)
    }

    private fire(type: string): void {
        for (const cb of this.listeners.get(type) ?? []) cb()
    }

    open(method: string, url: string): void {
        this.method = method
        this.url = url
    }

    setRequestHeader(key: string, value: string): void {
        this.requestHeaders[key] = value
    }

    getResponseHeader(name: string): string | null {
        const target = name.toLowerCase()
        for (const [key, value] of Object.entries(this.responseHeaders)) {
            if (key.toLowerCase() === target) return value
        }
        return null
    }

    abort(): void {
        if (this.settled) return
        this.settled = true
        this.fire('abort')
    }

    send(body: unknown): void {
        const responder = MockXhr.responder
        if (!responder) {
            throw new Error('installXhrPartMock: no responder set')
        }
        const progress: Listener = () => {
            if (this.settled) return
            for (const cb of this.upload.progressListeners) cb()
        }
        void Promise.resolve(
            responder(
                {
                    method: this.method,
                    url: this.url,
                    headers: this.requestHeaders,
                    body,
                },
                progress,
            ),
        ).then(
            response => {
                if (this.settled) return
                this.settled = true
                this.status = response.status
                this.statusText = response.statusText ?? ''
                this.responseText = response.responseText ?? ''
                this.responseHeaders = response.headers ?? {}
                this.fire('load')
            },
            () => {
                // A rejected responder models a network-level failure: XHR
                // reports it via the `error` event, never `load`.
                if (this.settled) return
                this.settled = true
                this.fire('error')
            },
        )
    }
}

export interface InstalledXhrPartMock {
    /** The vi.fn the strategy's part PUT calls — the fetch mock's replacement. */
    puts: PartResponder
    /**
     * Re-stub the global XMLHttpRequest. Idempotent, and needed by suites whose
     * `afterEach` calls `vi.unstubAllGlobals()` (which also clears this stub):
     * call it again in `beforeEach` to restore the stand-in.
     */
    install(): void
    /**
     * Install the default healthy responder: a 200 whose `ETag` is derived from
     * the part number in the signed URL (`…/part<N>?…`), the shape S3 returns.
     */
    respondOk(): void
}

/**
 * Installs the global XMLHttpRequest stand-in and returns its handle. Call once
 * per suite at module scope; reset `puts` in `beforeEach`.
 */
export function installXhrPartMock(): InstalledXhrPartMock {
    const puts: PartResponder =
        vi.fn<
            (req: PartRequest, progress: () => void) => Promise<PartResponse>
        >()
    MockXhr.responder = puts

    const install = () => {
        MockXhr.responder = puts
        vi.stubGlobal('XMLHttpRequest', MockXhr)
    }
    install()

    const respondOk = () => {
        puts.mockImplementation(async (req: PartRequest) => {
            const partNumber = Number(/part(\d+)/.exec(req.url)?.[1] ?? '0')
            return { status: 200, headers: { ETag: `"etag-${partNumber}"` } }
        })
    }

    return { puts, install, respondOk }
}
