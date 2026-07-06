import type { ObservableController } from './types'

export type ServerModeProvider = 'google-drive' | 'onedrive' | 'dropbox' | 'box'

export interface ServerDriveFile {
    id: string
    name: string
    size?: number
    mimeType?: string
    thumbnailUrl?: string
    isFolder: boolean
    modifiedAt?: string
}

export type ServerDriveListState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; files: ServerDriveFile[] }
    | { status: 'reauth' }
    | { status: 'error'; message: string; code?: string }

export type ServerDriveTransferResult =
    | { status: 'ok'; result: unknown }
    | { status: 'reauth' }
    | { status: 'error'; message: string; code?: string }

export interface ServerDriveSnapshot {
    state: ServerDriveListState
    folderId: string | undefined
    search: string
}

export interface ServerModeDriveDeps {
    provider: ServerModeProvider
    /** Getter so the controller never reads a runtime global at construction. */
    serverUrl: () => string | undefined
}

export class ServerModeDriveController implements ObservableController<ServerDriveSnapshot> {
    private snapshot: ServerDriveSnapshot = {
        state: { status: 'idle' },
        folderId: undefined,
        search: '',
    }
    private listeners = new Set<() => void>()
    private abort: AbortController | null = null
    private authListener: ((ev: MessageEvent) => void) | null = null

    constructor(private deps: ServerModeDriveDeps) {
        this.list = this.list.bind(this)
        this.refresh = this.refresh.bind(this)
        this.transfer = this.transfer.bind(this)
        this.startAuth = this.startAuth.bind(this)
    }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    getSnapshot = (): ServerDriveSnapshot => this.snapshot

    private setState(p: Partial<ServerDriveSnapshot>): void {
        this.snapshot = { ...this.snapshot, ...p }
        this.listeners.forEach(fn => fn())
    }

    /** Initial list. Call on mount. */
    init(): void {
        void this.list()
    }

    async list(opts?: { folderId?: string; search?: string }): Promise<void> {
        const serverUrl = this.deps.serverUrl()
        if (!serverUrl) {
            this.setState({
                state: {
                    status: 'error',
                    message: 'Server Mode requires `serverUrl` prop',
                },
            })
            return
        }
        this.abort?.abort()
        const ac = new AbortController()
        this.abort = ac
        this.setState({ state: { status: 'loading' } })

        const params = new URLSearchParams()
        const nextFolder = opts?.folderId ?? this.snapshot.folderId
        const nextSearch = opts?.search ?? this.snapshot.search
        if (nextFolder) params.set('folderId', nextFolder)
        if (nextSearch) params.set('search', nextSearch)

        try {
            const res = await fetch(
                `${serverUrl}/files/${this.deps.provider}${params.toString() ? `?${params}` : ''}`,
                { credentials: 'include', signal: ac.signal },
            )
            if (res.status === 401) {
                // Drive-token 401 (server's tokenStore has no/expired provider token)
                // means "reconnect Drive"; an app-level 401 (e.g. config.auth denied
                // the request) is a DIFFERENT failure and must not show the reconnect
                // prompt (F-427). The server signals the former with {reauth:true}
                // on that exact response; anything else on a 401 is app-auth.
                const body = await res
                    .clone()
                    .json()
                    .catch(() => ({}) as { reauth?: boolean; error?: string })
                if (body?.reauth) {
                    this.setState({ state: { status: 'reauth' } })
                } else {
                    this.setState({
                        state: {
                            status: 'error',
                            message: body?.error ?? 'Unauthorized',
                            code: 'UNAUTHENTICATED',
                        },
                    })
                }
                return
            }
            if (!res.ok) {
                const text = await res.text().catch(() => '')
                throw new Error(text || `${res.status}`)
            }
            const data = (await res.json()) as { files: ServerDriveFile[] }
            this.setState({ state: { status: 'ready', files: data.files } })
        } catch (err) {
            if ((err as Error).name === 'AbortError') return
            this.setState({
                state: { status: 'error', message: (err as Error).message },
            })
        } finally {
            if (this.abort === ac) this.abort = null
        }
    }

    refresh(opts?: { folderId?: string; search?: string }): Promise<void> {
        return this.list(opts)
    }

    async transfer(file: ServerDriveFile): Promise<ServerDriveTransferResult> {
        const serverUrl = this.deps.serverUrl()
        if (!serverUrl)
            return {
                status: 'error',
                message: 'Server Mode requires `serverUrl` prop',
            }
        try {
            const res = await fetch(
                `${serverUrl}/files/${this.deps.provider}/transfer`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileId: file.id,
                        fileName: file.name,
                        size: file.size,
                        mimeType: file.mimeType,
                    }),
                },
            )
            if (res.status === 401) {
                // Same reauth-vs-app-auth distinction as list() above (F-427): only
                // a body-flagged {reauth:true} means "reconnect Drive".
                const body = await res
                    .clone()
                    .json()
                    .catch(() => ({}) as { reauth?: boolean; error?: string })
                if (body?.reauth) return { status: 'reauth' }
                return {
                    status: 'error',
                    message: body?.error ?? 'Unauthorized',
                    code: 'UNAUTHENTICATED',
                }
            }
            if (!res.ok) {
                const text = await res.text().catch(() => '')
                return { status: 'error', message: text || `${res.status}` }
            }
            const result = await res.json()
            return { status: 'ok', result }
        } catch (err) {
            return { status: 'error', message: (err as Error).message }
        }
    }

    startAuth(): void {
        const serverUrl = this.deps.serverUrl()
        if (!serverUrl) return
        if (this.authListener) {
            window.removeEventListener('message', this.authListener)
            this.authListener = null
        }
        const popup = window.open(
            `${serverUrl}/auth/${this.deps.provider}`,
            'upup-oauth',
            'width=600,height=700',
        )
        if (!popup) {
            this.setState({
                state: {
                    status: 'error',
                    message: 'Popup blocked. Allow popups and try again.',
                },
            })
            return
        }
        const onMessage = (ev: MessageEvent) => {
            const data = ev.data as
                { type?: string; provider?: string } | undefined
            if (
                data?.type === 'upup:oauth-success' &&
                data.provider === this.deps.provider
            ) {
                window.removeEventListener('message', onMessage)
                if (this.authListener === onMessage) this.authListener = null
                void this.list()
            }
        }
        this.authListener = onMessage
        window.addEventListener('message', onMessage)
    }

    setFolderId(id: string | undefined): void {
        this.setState({ folderId: id })
    }
    setSearch(s: string): void {
        this.setState({ search: s })
    }

    /** Force the reauth view (used by batch consumers on a transfer 401). */
    requestReauth(): void {
        this.setState({ state: { status: 'reauth' } })
    }
    /** Force the error view (used by batch consumers on a transfer failure). */
    setError(message: string): void {
        this.setState({ state: { status: 'error', message } })
    }

    destroy(): void {
        this.abort?.abort()
        this.abort = null
        if (this.authListener) {
            window.removeEventListener('message', this.authListener)
            this.authListener = null
        }
        this.listeners.clear()
    }
}
