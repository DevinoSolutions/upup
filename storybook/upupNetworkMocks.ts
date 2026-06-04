const MOCK_PATH_PREFIX = '/storybook/upup'
const INSTALL_FLAG = '__upupStorybookMocksInstalled'

type MockWindow = Window & {
    [INSTALL_FLAG]?: boolean
    google?: {
        accounts?: {
            oauth2?: {
                initTokenClient?: (config: {
                    callback?: (token: {
                        access_token: string
                        expires_in: number
                    }) => void
                    error_callback?: (error: {
                        type: string
                        message?: string
                    }) => void
                }) => { requestAccessToken: () => void }
            }
        }
    }
}

type Listener = (event: any) => void

class ListenerStore {
    private listeners = new Map<string, Set<Listener>>()

    add(type: string, listener: EventListenerOrEventListenerObject | null) {
        if (!listener) return
        const callback =
            typeof listener === 'function'
                ? listener
                : (event: Event) => listener.handleEvent(event)
        const set = this.listeners.get(type) ?? new Set<Listener>()
        set.add(callback as Listener)
        this.listeners.set(type, set)
    }

    remove(type: string, listener: EventListenerOrEventListenerObject | null) {
        if (!listener) return
        const set = this.listeners.get(type)
        if (!set) return
        for (const callback of set) {
            if (callback === listener) {
                set.delete(callback)
            }
        }
    }

    dispatch(type: string, event: any) {
        for (const callback of this.listeners.get(type) ?? []) {
            callback(event)
        }
    }
}

function toUrl(input: RequestInfo | URL): URL | undefined {
    try {
        if (typeof input === 'string') {
            return new URL(input, window.location.href)
        }
        if (input instanceof URL) {
            return new URL(input.href, window.location.href)
        }
        if (typeof Request !== 'undefined' && input instanceof Request) {
            return new URL(input.url, window.location.href)
        }
    } catch {
        return undefined
    }
    return undefined
}

function isMockUrl(url: URL): boolean {
    return url.pathname.startsWith(MOCK_PATH_PREFIX)
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    }
    new Headers(init.headers).forEach((value, key) => {
        headers[key] = value
    })

    return new Response(JSON.stringify(body), {
        status: init.status ?? 200,
        statusText: init.statusText,
        headers,
    })
}

function textResponse(body: string, init: ResponseInit = {}) {
    const headers: Record<string, string> = {
        'Content-Type': 'text/plain',
    }
    new Headers(init.headers).forEach((value, key) => {
        headers[key] = value
    })

    return new Response(body, {
        status: init.status ?? 200,
        statusText: init.statusText,
        headers,
    })
}

async function readJsonBody(
    input: RequestInfo | URL,
    init?: RequestInit,
): Promise<Record<string, unknown>> {
    const body = init?.body
    try {
        if (typeof body === 'string') {
            return JSON.parse(body) as Record<string, unknown>
        }
        if (body instanceof Blob) {
            return JSON.parse(await body.text()) as Record<string, unknown>
        }
        if (typeof Request !== 'undefined' && input instanceof Request) {
            return await input.clone().json()
        }
    } catch {
        return {}
    }
    return {}
}

function safeFileName(value: unknown): string {
    const name = typeof value === 'string' && value.length > 0 ? value : 'file.bin'
    return name.replace(/[^\w.-]+/g, '_')
}

function mockPresignPayload(
    url: URL,
    body: Record<string, unknown>,
    uploadKind: 'success' | 'slow' | 'error' = 'success',
) {
    const name = safeFileName(body.name)
    const key = `storybook/${Date.now()}-${name}`
    return {
        uploadUrl: `${url.origin}${MOCK_PATH_PREFIX}/upload/${uploadKind}/${name}`,
        key,
        publicUrl: `${url.origin}${MOCK_PATH_PREFIX}/object/${key}`,
        expiresIn: 3600,
    }
}

function mockDriveFiles(search: string | null) {
    const files = [
        {
            id: 'folder-1',
            name: 'Finance',
            isFolder: true,
        },
        {
            id: 'file-1',
            name: 'quarterly-report.pdf',
            size: 4096,
            mimeType: 'application/pdf',
            isFolder: false,
            modifiedAt: '2026-05-29T16:45:00.000Z',
        },
        {
            id: 'file-2',
            name: 'launch-photo.png',
            size: 2048,
            mimeType: 'image/png',
            isFolder: false,
            modifiedAt: '2026-05-29T16:45:00.000Z',
        },
    ]
    if (!search) return files
    return files.filter(file =>
        file.name.toLowerCase().includes(search.toLowerCase()),
    )
}

async function handleMockFetch(
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    url: URL,
): Promise<Response> {
    const path = url.pathname
    const body = await readJsonBody(input, init)

    if (path.endsWith('/presign') || path.includes('/presign/')) {
        if (path.includes('/error/') || path.endsWith('/presign/error')) {
            return jsonResponse(
                { error: 'Storybook presign failure' },
                { status: 500, statusText: 'Mock Presign Failure' },
            )
        }
        const uploadKind = path.includes('slow')
            ? 'slow'
            : path.includes('upload-failure')
              ? 'error'
              : 'success'
        return jsonResponse(mockPresignPayload(url, body, uploadKind))
    }

    if (path.includes('/files/')) {
        if (path.endsWith('/transfer')) {
            return jsonResponse({
                key: 'storybook/server-drive/quarterly-report.pdf',
                publicUrl: `${url.origin}${MOCK_PATH_PREFIX}/object/quarterly-report.pdf`,
            })
        }
        if (url.searchParams.get('reauth') === '1') {
            return jsonResponse(
                { error: 'reauth required' },
                { status: 401, statusText: 'Unauthorized' },
            )
        }
        return jsonResponse({ files: mockDriveFiles(url.searchParams.get('search')) })
    }

    if (path.includes('/object/missing')) {
        return textResponse('missing', {
            status: 404,
            statusText: 'Not Found',
        })
    }

    if (path.includes('/object/sample.txt')) {
        return textResponse('x'.repeat(2048), {
            headers: {
                'Content-Disposition': 'attachment; filename="sample.txt"',
            },
        })
    }

    if (path.includes('/object/no-content-type')) {
        return new Response('no content type', { status: 200 })
    }

    if (path.includes('/object/disposition')) {
        return textResponse('safe filename', {
            headers: {
                'Content-Disposition': 'attachment; filename="bad<name?.txt"',
            },
        })
    }

    return jsonResponse({ ok: true })
}

function installFetchMocks(nativeFetch: typeof fetch) {
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = toUrl(input)
        if (!url || !isMockUrl(url)) {
            return nativeFetch(input, init)
        }
        return handleMockFetch(input, init, url)
    }
}

function installXhrMocks(NativeXMLHttpRequest: typeof XMLHttpRequest) {
    class MockableXMLHttpRequest {
        static readonly UNSENT = 0
        static readonly OPENED = 1
        static readonly HEADERS_RECEIVED = 2
        static readonly LOADING = 3
        static readonly DONE = 4

        readonly UNSENT = 0
        readonly OPENED = 1
        readonly HEADERS_RECEIVED = 2
        readonly LOADING = 3
        readonly DONE = 4

        private readonly real = new NativeXMLHttpRequest()
        private readonly listeners = new ListenerStore()
        private readonly uploadListeners = new ListenerStore()
        private requestUrl: URL | undefined
        private mockStatus = 0
        private mockStatusText = ''
        private mockReadyState = 0
        private aborted = false

        onload: ((event: any) => void) | null = null
        onerror: ((event: any) => void) | null = null
        onabort: ((event: any) => void) | null = null
        onreadystatechange: ((event: any) => void) | null = null

        upload = {
            addEventListener: (
                type: string,
                listener: EventListenerOrEventListenerObject | null,
            ) => {
                this.uploadListeners.add(type, listener)
                this.real.upload.addEventListener(type as any, listener as any)
            },
            removeEventListener: (
                type: string,
                listener: EventListenerOrEventListenerObject | null,
            ) => {
                this.uploadListeners.remove(type, listener)
                this.real.upload.removeEventListener(type as any, listener as any)
            },
        }

        get status() {
            return this.isMockUpload() ? this.mockStatus : this.real.status
        }

        get statusText() {
            return this.isMockUpload()
                ? this.mockStatusText
                : this.real.statusText
        }

        get readyState() {
            return this.isMockUpload()
                ? this.mockReadyState
                : this.real.readyState
        }

        get responseText() {
            return this.isMockUpload() ? '' : this.real.responseText
        }

        get withCredentials() {
            return this.real.withCredentials
        }

        set withCredentials(value: boolean) {
            this.real.withCredentials = value
        }

        open(
            method: string,
            url: string | URL,
            async = true,
            username?: string | null,
            password?: string | null,
        ) {
            this.requestUrl = toUrl(url)
            this.mockReadyState = 1
            if (!this.isMockUpload()) {
                this.real.open(method, url, async, username ?? undefined, password ?? undefined)
            }
        }

        setRequestHeader(name: string, value: string) {
            if (!this.isMockUpload()) {
                this.real.setRequestHeader(name, value)
            }
        }

        addEventListener(
            type: string,
            listener: EventListenerOrEventListenerObject | null,
        ) {
            this.listeners.add(type, listener)
            this.real.addEventListener(type as any, listener as any)
        }

        removeEventListener(
            type: string,
            listener: EventListenerOrEventListenerObject | null,
        ) {
            this.listeners.remove(type, listener)
            this.real.removeEventListener(type as any, listener as any)
        }

        send(body?: Document | XMLHttpRequestBodyInit | null) {
            if (!this.isMockUpload()) {
                this.real.send(body)
                return
            }

            const total =
                body instanceof Blob && body.size > 0 ? body.size : 2048
            const isSlow = this.requestUrl?.pathname.includes('/upload/slow/')
            const shouldFail =
                this.requestUrl?.pathname.includes('/upload/error/')
            const steps = isSlow ? [0.15, 0.45, 0.75, 1] : [0.5, 1]
            const delayMs = isSlow ? 300 : 60

            const run = async () => {
                this.mockReadyState = 3
                this.dispatch('readystatechange', { target: this })
                for (const step of steps) {
                    if (this.aborted) return
                    await delay(delayMs)
                    this.uploadListeners.dispatch('progress', {
                        lengthComputable: true,
                        loaded: Math.round(total * step),
                        total,
                        target: this.upload,
                    })
                }
                if (this.aborted) return
                this.mockStatus = shouldFail ? 503 : 200
                this.mockStatusText = shouldFail ? 'Mock Upload Failure' : 'OK'
                this.mockReadyState = 4
                this.dispatch('readystatechange', { target: this })
                this.dispatch('load', { target: this })
            }

            void run()
        }

        abort() {
            if (!this.isMockUpload()) {
                this.real.abort()
                return
            }
            this.aborted = true
            this.mockStatus = 0
            this.mockReadyState = 4
            this.dispatch('abort', { target: this })
        }

        private isMockUpload() {
            return !!this.requestUrl?.pathname.startsWith(
                `${MOCK_PATH_PREFIX}/upload/`,
            )
        }

        private dispatch(type: string, event: any) {
            this.listeners.dispatch(type, event)
            const handler = this[`on${type}` as keyof this]
            if (typeof handler === 'function') {
                ;(handler as Listener)(event)
            }
        }
    }

    window.XMLHttpRequest =
        MockableXMLHttpRequest as unknown as typeof XMLHttpRequest
}

function installEventSourceMocks(NativeEventSource: typeof EventSource) {
    class MockableEventSource {
        static readonly CONNECTING = 0
        static readonly OPEN = 1
        static readonly CLOSED = 2

        readonly CONNECTING = 0
        readonly OPEN = 1
        readonly CLOSED = 2

        private readonly listeners = new ListenerStore()
        private readonly real?: EventSource
        private readyStateValue = 0
        private messageHandler: ((event: MessageEvent) => void) | null = null
        private errorHandler: ((event: Event) => void) | null = null
        private openHandler: ((event: Event) => void) | null = null

        constructor(readonly url: string | URL, init?: EventSourceInit) {
            const parsed = toUrl(url)
            if (!parsed || !parsed.pathname.startsWith(`${MOCK_PATH_PREFIX}/processing/`)) {
                this.real = new NativeEventSource(url, init)
                return
            }

            window.setTimeout(() => {
                this.readyStateValue = 1
                this.dispatch('open', new Event('open'))

                if (parsed.pathname.includes('/timeout')) return

                window.setTimeout(() => {
                    if (this.readyStateValue === 2) return
                    if (parsed.pathname.includes('/failure')) {
                        this.readyStateValue = 2
                        this.dispatch('error', new Event('error'))
                        return
                    }
                    const key = parsed.searchParams.get('key') ?? 'unknown'
                    this.dispatch(
                        'message',
                        new MessageEvent('message', {
                            data: JSON.stringify({
                                status: 'processed',
                                key,
                                source: 'storybook',
                            }),
                        }),
                    )
                }, 250)
            }, 25)
        }

        get readyState() {
            return this.real?.readyState ?? this.readyStateValue
        }

        get onmessage() {
            return this.real?.onmessage ?? this.messageHandler
        }

        set onmessage(handler) {
            this.messageHandler = handler
            if (this.real) this.real.onmessage = handler
        }

        get onerror() {
            return this.real?.onerror ?? this.errorHandler
        }

        set onerror(handler) {
            this.errorHandler = handler
            if (this.real) this.real.onerror = handler
        }

        get onopen() {
            return this.real?.onopen ?? this.openHandler
        }

        set onopen(handler) {
            this.openHandler = handler
            if (this.real) this.real.onopen = handler
        }

        addEventListener(
            type: string,
            listener: EventListenerOrEventListenerObject | null,
        ) {
            this.listeners.add(type, listener)
            this.real?.addEventListener(type as any, listener as any)
        }

        removeEventListener(
            type: string,
            listener: EventListenerOrEventListenerObject | null,
        ) {
            this.listeners.remove(type, listener)
            this.real?.removeEventListener(type as any, listener as any)
        }

        close() {
            this.readyStateValue = 2
            this.real?.close()
        }

        private dispatch(type: 'open' | 'message' | 'error', event: Event) {
            this.listeners.dispatch(type, event)
            if (type === 'open') this.openHandler?.(event)
            if (type === 'message') this.messageHandler?.(event as MessageEvent)
            if (type === 'error') this.errorHandler?.(event)
        }
    }

    window.EventSource = MockableEventSource as unknown as typeof EventSource
}

function installMediaMocks() {
    if (!navigator.mediaDevices) {
        Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: {},
        })
    }

    const mediaDevices = navigator.mediaDevices as MediaDevices & {
        getDisplayMedia?: (constraints?: MediaStreamConstraints) => Promise<MediaStream>
    }

    const createVideoStream = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 320
        canvas.height = 180
        const ctx = canvas.getContext('2d')
        if (ctx) {
            ctx.fillStyle = '#0f172a'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.fillStyle = '#38bdf8'
            ctx.font = '24px sans-serif'
            ctx.fillText('Upup Storybook', 64, 96)
        }
        return typeof canvas.captureStream === 'function'
            ? canvas.captureStream(10)
            : new MediaStream()
    }

    Object.defineProperty(mediaDevices, 'getUserMedia', {
        configurable: true,
        value: async () => createVideoStream(),
    })

    Object.defineProperty(mediaDevices, 'getDisplayMedia', {
        configurable: true,
        value: async () => createVideoStream(),
    })
}

function installGoogleIdentityMocks() {
    const mockWindow = window as MockWindow
    if (mockWindow.google?.accounts?.oauth2?.initTokenClient) return

    mockWindow.google = {
        ...(mockWindow.google ?? {}),
        accounts: {
            ...(mockWindow.google?.accounts ?? {}),
            oauth2: {
                ...(mockWindow.google?.accounts?.oauth2 ?? {}),
                initTokenClient: config => ({
                    requestAccessToken: () => {
                        config.error_callback?.({
                            type: 'popup_closed',
                            message: 'Storybook Google auth is mocked.',
                        })
                    },
                }),
            },
        },
    }
}

function delay(ms: number) {
    return new Promise(resolve => window.setTimeout(resolve, ms))
}

export function installUpupStorybookMocks() {
    if (typeof window === 'undefined') return
    const mockWindow = window as MockWindow
    if (mockWindow[INSTALL_FLAG]) return

    mockWindow[INSTALL_FLAG] = true
    installFetchMocks(window.fetch.bind(window))
    installXhrMocks(window.XMLHttpRequest)
    if ('EventSource' in window) {
        installEventSourceMocks(window.EventSource)
    }
    installMediaMocks()
    installGoogleIdentityMocks()
}
