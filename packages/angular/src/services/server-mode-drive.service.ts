import { Injectable, inject, signal, type Signal } from '@angular/core'
import { UpupStore } from '../upup-store.service'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ServerModeProvider = 'google-drive' | 'onedrive' | 'dropbox' | 'box'

export type ServerDriveFile = {
    id: string
    name: string
    size?: number
    mimeType?: string
    thumbnailUrl?: string
    isFolder: boolean
    modifiedAt?: string
}

export type ListState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; files: ServerDriveFile[] }
    | { status: 'reauth' }
    | { status: 'error'; message: string }

export const PROVIDER_LABEL: Record<ServerModeProvider, string> = {
    'google-drive': 'Google Drive',
    onedrive: 'OneDrive',
    dropbox: 'Dropbox',
    box: 'Box',
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Angular port of useServerModeDrive.ts (svelte composable) + vanilla's ServerModeDrive.
 *
 * Manages the full server-mode drive lifecycle:
 *   - Fetches the drive listing from the server endpoint with an AbortController
 *   - On 401, transitions to 'reauth' state and surfaces the re-auth path
 *     (opens a popup + arms a window 'message' listener to receive the auth result, then retries)
 *   - dispose() MUST abort any in-flight list request AND remove the 'message' listener
 *
 * Double-brace {{provider}} placeholders are resolved by DriveAuthFallbackComponent
 * via core's formatUiMessage — NOT here (this service only tracks state).
 *
 * Regression guards (mirrors vanilla's 3 guards):
 *   1. 401 → reauth state (sign-in fallback rendered, no browser testid)
 *   2. dispose() aborts the AbortController for an in-flight list
 *   3. dispose() removes the window 'message' listener armed by startAuth()
 */
@Injectable()
export class ServerModeDriveService {
    private store = inject(UpupStore)

    // ── Reactive state (Angular signals) ──────────────────────────
    readonly listState = signal<ListState>({ status: 'idle' })
    readonly folderId = signal<string | undefined>(undefined)
    readonly search = signal<string>('')
    readonly selected = signal<Set<string>>(new Set())
    readonly isTransferring = signal<boolean>(false)

    // ── Internal lifecycle state ──────────────────────────────────
    private abort: AbortController | null = null
    private authListener: ((ev: MessageEvent) => void) | null = null
    private provider!: ServerModeProvider

    /** Call from the component's ngOnInit — kicks the initial list(). */
    init(provider: ServerModeProvider): void {
        this.provider = provider
        void this.list()
    }

    // ── List ──────────────────────────────────────────────────────

    async list(opts?: { folderId?: string; search?: string }): Promise<void> {
        const serverUrl = this.store.serverUrl
        if (!serverUrl) {
            this.listState.set({ status: 'error', message: 'Server Mode requires `serverUrl` prop' })
            return
        }

        // Abort any in-flight request before starting a new one
        this.abort?.abort()
        const ac = new AbortController()
        this.abort = ac
        this.listState.set({ status: 'loading' })

        const params = new URLSearchParams()
        const nextFolder = opts?.folderId ?? this.folderId()
        const nextSearch = opts?.search ?? this.search()
        if (nextFolder) params.set('folderId', nextFolder)
        if (nextSearch) params.set('search', nextSearch)

        try {
            const res = await fetch(
                `${serverUrl}/files/${this.provider}${params.toString() ? `?${params}` : ''}`,
                { credentials: 'include', signal: ac.signal },
            )
            if (res.status === 401) {
                this.listState.set({ status: 'reauth' })
                return
            }
            if (!res.ok) {
                const text = await res.text().catch(() => '')
                throw new Error(text || `${res.status}`)
            }
            const data = (await res.json()) as { files: ServerDriveFile[] }
            this.listState.set({ status: 'ready', files: data.files })
        } catch (err) {
            if ((err as Error).name === 'AbortError') return
            this.listState.set({ status: 'error', message: (err as Error).message })
        } finally {
            if (this.abort === ac) {
                this.abort = null
            }
        }
    }

    // ── Re-auth popup ─────────────────────────────────────────────

    /**
     * Opens the OAuth popup and arms a window 'message' listener.
     * On receipt of upup:oauth-success for this provider, removes the listener and retries list().
     * The listener reference is stored in this.authListener for disposal.
     */
    startAuth(): void {
        const serverUrl = this.store.serverUrl
        if (!serverUrl) return

        const popup = window.open(
            `${serverUrl}/auth/${this.provider}`,
            'upup-oauth',
            'width=600,height=700',
        )
        if (!popup) {
            this.listState.set({ status: 'error', message: 'Popup blocked. Allow popups and try again.' })
            return
        }

        const onMessage = (ev: MessageEvent) => {
            const data = ev.data as { type?: string; provider?: string } | undefined
            if (data?.type === 'upup:oauth-success' && data.provider === this.provider) {
                window.removeEventListener('message', onMessage)
                if (this.authListener === onMessage) this.authListener = null
                void this.list()
            }
        }
        this.authListener = onMessage
        window.addEventListener('message', onMessage)
    }

    // ── Selection ─────────────────────────────────────────────────

    toggleSelected(id: string): void {
        const next = new Set(this.selected())
        if (next.has(id)) { next.delete(id) } else { next.add(id) }
        this.selected.set(next)
    }

    setFolderId(id: string | undefined): void {
        this.folderId.set(id)
    }

    setSearch(s: string): void {
        this.search.set(s)
    }

    // ── Transfer ──────────────────────────────────────────────────

    async transfer(): Promise<void> {
        const serverUrl = this.store.serverUrl
        const state = this.listState()
        if (!serverUrl || state.status !== 'ready') return

        const toTransfer = state.files.filter(f => this.selected().has(f.id))
        if (!toTransfer.length) return

        this.isTransferring.set(true)
        try {
            for (const file of toTransfer) {
                const res = await fetch(`${serverUrl}/files/${this.provider}/transfer`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileId: file.id,
                        fileName: file.name,
                        size: file.size,
                        mimeType: file.mimeType,
                    }),
                })
                if (res.status === 401) {
                    this.listState.set({ status: 'reauth' })
                    return
                }
                if (!res.ok) {
                    const text = await res.text().catch(() => '')
                    this.listState.set({ status: 'error', message: text || `${res.status}` })
                    return
                }
                const result = await res.json() as { file?: File }
                if (result.file) {
                    void this.store.handleSetSelectedFiles([result.file as File])
                }
            }
            this.selected.set(new Set())
        } finally {
            this.isTransferring.set(false)
        }
    }

    // ── Dispose ───────────────────────────────────────────────────

    /**
     * Abort any in-flight list request AND remove the window 'message' listener.
     * Must be called from ngOnDestroy to prevent resource leaks.
     * Mirrors vanilla's disposeServerDrives():
     *   c.abort?.abort()
     *   window.removeEventListener('message', c.authListener)
     */
    dispose(): void {
        this.abort?.abort()
        this.abort = null
        if (this.authListener) {
            window.removeEventListener('message', this.authListener)
            this.authListener = null
        }
    }

    // ── Convenience getters ───────────────────────────────────────

    get providerLabel(): string {
        return PROVIDER_LABEL[this.provider]
    }

    /** Exposed for test access (guard 3: verify the listener reference). */
    get _authListener(): ((ev: MessageEvent) => void) | null {
        return this.authListener
    }

    /** Exposed for test access (guard 2: verify the abort controller). */
    get _abort(): AbortController | null {
        return this.abort
    }
}
