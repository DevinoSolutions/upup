import type { UpupCore } from '../core'
import { bindDriveEvents } from './bind-drive-events'
import type {
    DriveBrowserError,
    DriveFile,
    DriveFolder,
    DriveUser,
} from './types'
import type { DriveProviderDescriptor } from './drive-browser-descriptors'
import { loadGoogleIdentityServices } from '../utils/load-gapi'
import type { DrivePlugin } from './plugin'

export interface DriveBrowserState {
    user?: DriveUser | undefined
    /** Contents of the currently displayed folder (legacy: googleFiles/oneDriveFiles/…). */
    folder?: DriveFolder | undefined
    path: DriveFolder[]
    selectedFiles: DriveFile[]
    isClickLoading: boolean
    showLoader: boolean
    /** GIS: token client ready. Popup: set true after mount restore. */
    isAuthReady: boolean
    isAuthenticated: boolean
    isLoading: boolean
    /** GIS only: user dismissed the consent popup. */
    authCancelled: boolean
    /** GIS only: the acquired access token. */
    token?: { access_token: string; expires_in: number } | undefined
    /** The one drive-failure surface (auth/load/download/search, any provider). undefined = no error. */
    error?: DriveBrowserError | undefined
    /** Drives the "Load more" button. Wired in F-125 (hasMore/loadMore); defaults false until then. */
    hasMore: boolean
    /** Load-more button spinner/disabled state. */
    isLoadingMore: boolean
}

export interface DriveBrowserCallbacks {
    /** Push downloaded files into the uploader (host maps to context setFiles). */
    onFilesSelected: (files: File[]) => void
    /** Close the adapter browser view (host maps to setActiveSource(undefined)). */
    onClose: () => void
}

interface GisTokenResponse {
    access_token: string
    expires_in: number
    error?: string
}
interface GisTokenClient {
    requestAccessToken: (opts?: object) => void
}
interface FilesLoadedPayload {
    files: DriveFile[]
    folderId?: string
    path?: string
    hasMore?: boolean
    cursor?: string
}
type GoogleDriveConfigLike = { clientId?: string; apiKey?: string }

const GIS_SCOPE =
    'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile'

/**
 * Framework-agnostic cloud-drive browser store. One instance per provider per
 * mounted adapter view. Mirrors UploaderOrchestrator's subscribe/getSnapshot
 * pattern so every framework binds it the same way.
 */
export class DriveBrowserController {
    private state: DriveBrowserState
    private listeners = new Set<() => void>()
    private core: UpupCore
    private descriptor: DriveProviderDescriptor
    private callbacks: DriveBrowserCallbacks
    private plugin: DrivePlugin | null = null
    private tokenClient: GisTokenClient | null = null
    private unsubs: (() => void)[] = []
    /** Real name of the folder being navigated into, captured at click time. */
    private pendingFolder?: { id: string; name: string } | undefined
    /** Opaque continuation token from the most recent files-loaded/loadMoreFiles payload (F-125). */
    private cursor?: string | undefined

    constructor(
        core: UpupCore,
        descriptor: DriveProviderDescriptor,
        callbacks: DriveBrowserCallbacks,
    ) {
        this.core = core
        this.descriptor = descriptor
        this.callbacks = callbacks
        this.state = {
            user: undefined,
            folder: undefined,
            path: [],
            selectedFiles: [],
            isClickLoading: false,
            showLoader: false,
            isAuthReady: false,
            isAuthenticated: false,
            isLoading: true,
            authCancelled: false,
            token: undefined,
            error: undefined,
            hasMore: false,
            isLoadingMore: false,
        }
    }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    getSnapshot = (): DriveBrowserState => this.state

    protected setState(partial: Partial<DriveBrowserState>): void {
        this.state = { ...this.state, ...partial }
        this.notify()
    }

    private notify(): void {
        this.listeners.forEach(fn => fn())
    }

    // ── Lifecycle ────────────────────────────────────────────────

    init(): void {
        const plugin = this.core.getPlugin(this.descriptor.pluginId) as
            DrivePlugin | undefined
        if (!plugin) return
        this.plugin = plugin

        this.restore(plugin)
        this.unsubs.push(this.bindEvents())

        if (this.descriptor.auth === 'gis') {
            void this.initGis(plugin)
        }
    }

    destroy(): void {
        this.unsubs.forEach(u => u())
        this.unsubs = []
        this.listeners.clear()
        this.plugin = null
        this.tokenClient = null
    }

    // ── Restore session on mount ─────────────────────────────────

    private restore(plugin: DrivePlugin): void {
        const restored = plugin.restoreSession()
        if (this.descriptor.auth === 'gis') {
            if (!restored) return
            this.setState({
                token: {
                    access_token: plugin.getAccessToken() || '',
                    expires_in: 3600,
                },
            })
            void (async () => {
                try {
                    const userInfo = await plugin.getUserInfo()
                    if (userInfo) this.setState({ user: userInfo })
                } catch {
                    // non-critical
                }
                await plugin.loadFiles(this.descriptor.loadFilesRootArg)
            })()
        } else {
            this.setState({ isAuthenticated: restored, isLoading: false })
            if (!restored) return
            // Fire-and-forget: neither branch may reject, else it strands the UI in an
            // unhandled rejection (F-123 — getUserInfo previously had no guard here).
            // loadFiles failures are still surfaced via the plugin's own error emit.
            void (async () => {
                try {
                    const userInfo = await plugin.getUserInfo()
                    if (userInfo) this.setState({ user: userInfo })
                } catch {
                    // non-critical — mirrors the GIS branch above
                }
                try {
                    await plugin.loadFiles(this.descriptor.loadFilesRootArg)
                } catch {
                    // surfaced via the plugin's error emit → onError
                }
            })()
        }
    }

    // ── Event subscriptions (the 6 canonical adapter events) ─────

    private bindEvents(): () => void {
        const isGis = this.descriptor.auth === 'gis'
        return bindDriveEvents(this.core, this.descriptor.eventPrefix, {
            onAuthenticated: (payload: unknown) => {
                const data = payload as { user?: DriveUser }
                if (isGis) {
                    if (data.user) this.setState({ user: data.user })
                    this.setState({ isAuthReady: true })
                } else {
                    this.setState({
                        user: data.user ?? this.state.user,
                        isAuthenticated: true,
                        isLoading: false,
                    })
                }
            },
            onSignedOut: () => {
                this.resetSession()
            },
            onSessionExpired: () => {
                this.resetSession()
            },
            onFilesLoaded: (payload: unknown) => {
                const p = payload as FilesLoadedPayload
                const folder = this.buildRootFolder(p)
                this.cursor = p.cursor
                this.setState({
                    folder,
                    path: this.nextPath(folder),
                    isClickLoading: false,
                    error: undefined,
                    hasMore: !!p.hasMore,
                })
            },
            onStateChange: (payload: unknown) => {
                const data = payload as { state: string }
                if (isGis) {
                    if (data.state === 'browsing')
                        this.setState({ isClickLoading: true })
                } else {
                    this.setState({
                        isLoading:
                            data.state === 'authenticating' ||
                            data.state === 'browsing',
                    })
                }
            },
            onError: (payload?: unknown) => {
                const p = payload as
                    { error?: Error; action?: string } | undefined
                this.setState({
                    isClickLoading: false,
                    showLoader: false,
                    isLoadingMore: false,
                    error: {
                        message: p?.error?.message || 'Unknown error',
                        action: p?.action,
                    },
                })
            },
        })
    }

    /**
     * The single session-teardown home (F-127). onSignedOut and onSessionExpired
     * previously drifted independently — onSessionExpired forgot to clear
     * selectedFiles/pendingFolder, leaking a stale selection into the next
     * sign-in. Both now delegate here.
     */
    private resetSession(): void {
        this.pendingFolder = undefined
        this.cursor = undefined
        this.setState({
            user: undefined,
            folder: undefined,
            token: undefined,
            path: [],
            selectedFiles: [],
            isAuthenticated: false,
            hasMore: false,
            error: undefined,
        })
    }

    private buildRootFolder(payload: FilesLoadedPayload): DriveFolder {
        const d = this.descriptor
        const rawId =
            d.folderIdField === 'path' ? payload.path : payload.folderId
        const id = rawId || d.rootFolderId
        const isRoot = !rawId || id === d.rootFolderId
        let name: string
        if (isRoot) name = d.rootFolderName
        // files-loaded echoes only the id/path, not the name, so reuse the name
        // captured at click time. This assumes folders are entered via handleClick
        // (the only navigated-load path today); a future reload-ancestor flow would
        // need to thread the name through too, else it falls back to the id/path below.
        else if (this.pendingFolder?.id === id) name = this.pendingFolder.name
        else if (d.folderKey === 'path')
            name = id.split('/').pop() || d.rootFolderName
        else name = id
        return {
            id,
            name,
            path: d.folderKey === 'path' ? payload.path || '' : '',
            size: 0,
            mimeType: '',
            isFolder: true,
            children: payload.files,
        }
    }

    // ── Auth ─────────────────────────────────────────────────────

    private async initGis(plugin: DrivePlugin): Promise<void> {
        const cfg = (plugin.getConfig?.() ?? {}) as GoogleDriveConfigLike
        if (!cfg.clientId || !cfg.apiKey) {
            // Degradation, not a normal path (F-124): the sign-in button would
            // otherwise be a silent dead end with no token client wired up.
            this.setState({
                isAuthReady: true,
                error: {
                    message:
                        'Google Drive is not configured (missing clientId/apiKey)',
                    action: 'init',
                },
            })
            return
        }
        if (plugin.isAuthenticated()) {
            this.setState({ isAuthReady: true })
            return
        }
        await loadGoogleIdentityServices()
        const google = (
            window as unknown as {
                google?: {
                    accounts: {
                        oauth2: {
                            initTokenClient(config: object): GisTokenClient
                        }
                    }
                }
            }
        ).google
        if (!google) {
            // Degradation, not a normal path (F-124): Google Identity Services failed
            // to attach the global — same dead-end sign-in button symptom.
            this.setState({
                isAuthReady: true,
                error: {
                    message: 'Google Identity Services failed to load',
                    action: 'init',
                },
            })
            return
        }
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: cfg.clientId,
            scope: GIS_SCOPE,
            ux_mode: 'popup',
            callback: (tokenResponse: GisTokenResponse) => {
                if (tokenResponse?.error) return
                this.setState({
                    authCancelled: false,
                    token: {
                        access_token: tokenResponse.access_token,
                        expires_in:
                            Date.now() + (tokenResponse.expires_in - 20) * 1000,
                    },
                })
                void plugin
                    .authenticate?.(
                        tokenResponse.access_token,
                        tokenResponse.expires_in,
                    )
                    .then(() =>
                        plugin.loadFiles(this.descriptor.loadFilesRootArg),
                    )
            },
            error_callback: () => {
                this.setState({ authCancelled: true })
            },
        })
        this.setState({ isAuthReady: true })
    }

    signIn(): void {
        if (this.descriptor.auth === 'gis') {
            this.tokenClient?.requestAccessToken({})
        } else {
            void this.runPopupAuth()
        }
    }

    retryAuth(): void {
        if (this.descriptor.auth === 'gis') {
            this.setState({ authCancelled: false })
            this.tokenClient?.requestAccessToken({})
        } else {
            void this.runPopupAuth()
        }
    }

    private async runPopupAuth(): Promise<void> {
        const plugin = this.plugin
        if (!plugin?.authenticateViaPopup) return
        this.setState({ isLoading: true })
        await plugin.authenticateViaPopup()
        if (plugin.isAuthenticated()) {
            await plugin.loadFiles(this.descriptor.loadFilesRootArg)
        }
    }

    signOut(): void {
        this.plugin?.signOut()
        this.setState({ token: undefined })
    }

    // ── Browse / select actions ──────────────────────────────────

    /**
     * Folder trail for the breadcrumb, owned here so every framework stays consistent
     * (react/vue/svelte previously seeded it in a component effect that collapsed the
     * trail; vanilla/angular had no seed at all). Root load resets to [root]; descending
     * appends; re-loading a folder already in the trail truncates to it. Ids must stay
     * unique — the breadcrumb is keyed by folder id.
     */
    private nextPath(folder: DriveFolder): DriveFolder[] {
        if (folder.id === this.descriptor.rootFolderId) return [folder]
        const cur = this.state.path
        const idx = cur.findIndex(p => p.id === folder.id)
        if (idx >= 0) return [...cur.slice(0, idx), folder]
        return [...cur, folder]
    }

    setPath(path: DriveFolder[]): void {
        // A breadcrumb-back jump lands on a cached folder view (see nextPath); its
        // continuation token belonged to whatever page was being listed when we left
        // it, so pagination resets rather than carrying a stale cursor forward.
        this.cursor = undefined
        this.setState({ path, hasMore: false })
    }

    handleClick(file: DriveFile): void {
        const plugin = this.plugin
        if (!plugin) return
        if (file.isFolder) {
            // Trail is derived from files-loaded (see nextPath). Navigating only flags
            // loading + requests the folder. (Was: pushed this.state.folder here, which
            // duplicated the seeded id → duplicate breadcrumb keys + collapsed trail.)
            this.setState({ isClickLoading: true })
            const arg =
                this.descriptor.folderKey === 'path' ? file.path : file.id
            // Stash the real name (keyed by the value that comes back as the loaded
            // folder id) so buildRootFolder can label the breadcrumb crumb with it.
            this.pendingFolder = { id: arg, name: file.name }
            void plugin.loadFiles(arg)
        } else {
            const prev = this.state.selectedFiles
            const next = prev.some(f => f.id === file.id)
                ? prev.filter(f => f.id !== file.id)
                : [...prev, file]
            this.setState({ selectedFiles: next })
        }
    }

    async handleSubmit(): Promise<void> {
        const plugin = this.plugin
        if (!plugin || this.state.selectedFiles.length === 0) return
        this.setState({ showLoader: true })
        try {
            await this.downloadAndClose(this.state.selectedFiles)
        } catch {
            // error surfaced via plugin event
        } finally {
            this.setState({ showLoader: false })
        }
    }

    handleCancelDownload(): void {
        this.setState({ selectedFiles: [] })
    }

    async onSelectCurrentFolder(): Promise<void> {
        const plugin = this.plugin
        if (!plugin) return

        if (this.descriptor.selectFolder === 'cached-children') {
            const current = this.state.path[this.state.path.length - 1]
            if (!current) return
            this.setState({ showLoader: true })
            try {
                await this.downloadAndClose(current.children)
            } catch {
                // error surfaced via plugin event
            } finally {
                this.setState({ showLoader: false })
            }
            return
        }

        // load-all (popup providers)
        if (!plugin.loadAllFilesInFolder || !this.state.folder) return
        this.setState({ showLoader: true })
        try {
            const folderArg =
                this.state.folder[this.descriptor.folderKey] ||
                this.descriptor.loadAllRootArg ||
                ''
            const all = await plugin.loadAllFilesInFolder(folderArg)
            await this.downloadAndClose(all)
        } catch {
            // error surfaced via plugin event
        } finally {
            this.setState({ showLoader: false })
        }
    }

    /**
     * Append-driven pagination (F-125), mirroring onSelectCurrentFolder's
     * await-then-use-the-return-value style rather than reacting to another
     * files-loaded event — the same convention, not a second one. A no-op
     * unless the plugin supports it, the current view has more to fetch, and
     * a continuation token exists.
     */
    async loadMore(): Promise<void> {
        const plugin = this.plugin
        if (
            !plugin?.loadMoreFiles ||
            !this.state.hasMore ||
            !this.cursor ||
            this.state.isLoadingMore
        ) {
            return
        }
        this.setState({ isLoadingMore: true, error: undefined })
        try {
            const page = await plugin.loadMoreFiles(this.cursor)
            const folder = this.state.folder
            if (!folder) {
                this.setState({ isLoadingMore: false })
                return
            }
            const merged = {
                ...folder,
                children: [...folder.children, ...page.files],
            }
            const path = this.state.path.slice()
            const tail = path[path.length - 1]
            if (tail && tail.id === folder.id) {
                path[path.length - 1] = merged
            }
            this.cursor = page.cursor
            this.setState({
                folder: merged,
                path,
                hasMore: page.hasMore,
                isLoadingMore: false,
            })
        } catch {
            // error already surfaced via the plugin's error emit → onError
            this.setState({ isLoadingMore: false })
        }
    }

    private async downloadAndClose(files: DriveFile[]): Promise<void> {
        const plugin = this.plugin
        if (!plugin) return
        const fileOnly = files.filter(f => !f.isFolder)
        if (fileOnly.length > 0) {
            const downloaded = await plugin.downloadFiles(fileOnly)
            if (downloaded.length > 0)
                this.callbacks.onFilesSelected(downloaded)
        }
        this.setState({ selectedFiles: [] })
        this.callbacks.onClose()
    }
}
