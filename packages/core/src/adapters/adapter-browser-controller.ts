import type { UpupCore } from '../core'
import { bindAdapterEvents } from './bind-adapter-events'
import type { DriveFile, DriveFolder, DriveUser } from './types'
import type { AdapterProviderDescriptor } from './drive-browser-descriptors'
import { loadGoogleIdentityServices } from '../utils/load-gapi'
import type { AdapterPlugin } from './plugin'

export interface AdapterBrowserState {
    user?: DriveUser
    /** Contents of the currently displayed folder (legacy: googleFiles/oneDriveFiles/…). */
    folder?: DriveFolder
    path: DriveFolder[]
    selectedFiles: DriveFile[]
    isClickLoading: boolean
    showLoader: boolean
    downloadProgress: number
    /** GIS: token client ready. Popup: set true after mount restore. */
    isAuthReady: boolean
    isAuthenticated: boolean
    isLoading: boolean
    /** GIS only: user dismissed the consent popup. */
    authCancelled: boolean
    /** GIS only: the acquired access token. */
    token?: { access_token: string; expires_in: number }
}

export interface AdapterBrowserCallbacks {
    /** Push downloaded files into the uploader (host maps to context setFiles). */
    onFilesSelected: (files: File[]) => void
    /** Close the adapter browser view (host maps to setActiveAdapter(undefined)). */
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
}
type GoogleDriveConfigLike = { google_client_id?: string; google_api_key?: string }

const GIS_SCOPE =
    'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile'

/**
 * Framework-agnostic cloud-drive browser store. One instance per provider per
 * mounted adapter view. Mirrors UploaderOrchestrator's subscribe/getSnapshot
 * pattern so every framework binds it the same way.
 */
export class AdapterBrowserController {
    private state: AdapterBrowserState
    private listeners = new Set<() => void>()
    private core: UpupCore
    private descriptor: AdapterProviderDescriptor
    private callbacks: AdapterBrowserCallbacks
    private plugin: AdapterPlugin | null = null
    private tokenClient: GisTokenClient | null = null
    private unsubs: (() => void)[] = []

    constructor(
        core: UpupCore,
        descriptor: AdapterProviderDescriptor,
        callbacks: AdapterBrowserCallbacks,
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
            downloadProgress: 0,
            isAuthReady: false,
            isAuthenticated: false,
            isLoading: true,
            authCancelled: false,
            token: undefined,
        }
    }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    getSnapshot = (): AdapterBrowserState => this.state

    protected setState(partial: Partial<AdapterBrowserState>): void {
        this.state = { ...this.state, ...partial }
        this.notify()
    }

    private notify(): void {
        this.listeners.forEach(fn => fn())
    }

    // ── Lifecycle ────────────────────────────────────────────────

    init(): void {
        const plugin = this.core.getPlugin(this.descriptor.pluginId) as
            | AdapterPlugin
            | undefined
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

    private restore(plugin: AdapterPlugin): void {
        const restored = plugin.restoreSession()
        if (this.descriptor.auth === 'gis') {
            if (!restored) return
            this.setState({
                token: { access_token: plugin.getAccessToken() || '', expires_in: 3600 },
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
            void (async () => {
                const userInfo = await plugin.getUserInfo()
                if (userInfo) this.setState({ user: userInfo })
                await plugin.loadFiles(this.descriptor.loadFilesRootArg)
            })()
        }
    }

    // ── Event subscriptions (the 6 canonical adapter events) ─────

    private bindEvents(): () => void {
        const isGis = this.descriptor.auth === 'gis'
        return bindAdapterEvents(this.core, this.descriptor.eventPrefix, {
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
                this.setState({
                    user: undefined,
                    folder: undefined,
                    token: undefined,
                    path: [],
                    selectedFiles: [],
                    isAuthenticated: false,
                })
            },
            onSessionExpired: () => {
                this.setState({
                    user: undefined,
                    folder: undefined,
                    token: undefined,
                    path: [],
                    isAuthenticated: false,
                })
            },
            onFilesLoaded: (payload: unknown) => {
                const folder = this.buildRootFolder(payload as FilesLoadedPayload)
                this.setState({ folder, path: this.nextPath(folder), isClickLoading: false })
            },
            onStateChange: (payload: unknown) => {
                const data = payload as { state: string }
                if (isGis) {
                    if (data.state === 'browsing') this.setState({ isClickLoading: true })
                } else {
                    this.setState({
                        isLoading: data.state === 'authenticating' || data.state === 'browsing',
                    })
                }
            },
            onError: () => {
                this.setState({ isClickLoading: false, showLoader: false })
            },
        })
    }

    private buildRootFolder(payload: FilesLoadedPayload): DriveFolder {
        const d = this.descriptor
        const rawId = d.folderIdField === 'path' ? payload.path : payload.folderId
        const id = rawId || d.rootFolderId
        const isRoot = !rawId || id === d.rootFolderId
        let name: string
        if (isRoot) name = d.rootFolderName
        else if (d.folderKey === 'path') name = id.split('/').pop() || d.rootFolderName
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

    private async initGis(plugin: AdapterPlugin): Promise<void> {
        const cfg = (plugin.getConfig?.() ?? {}) as GoogleDriveConfigLike
        if (!cfg.google_client_id || !cfg.google_api_key) {
            this.setState({ isAuthReady: true })
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
                    accounts: { oauth2: { initTokenClient(config: object): GisTokenClient } }
                }
            }
        ).google
        if (!google) {
            this.setState({ isAuthReady: true })
            return
        }
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: cfg.google_client_id,
            scope: GIS_SCOPE,
            ux_mode: 'popup',
            callback: (tokenResponse: GisTokenResponse) => {
                if (tokenResponse?.error) return
                this.setState({
                    authCancelled: false,
                    token: {
                        access_token: tokenResponse.access_token,
                        expires_in: Date.now() + (tokenResponse.expires_in - 20) * 1000,
                    },
                })
                void plugin
                    .authenticate?.(tokenResponse.access_token, tokenResponse.expires_in)
                    .then(() => plugin.loadFiles(this.descriptor.loadFilesRootArg))
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
        this.setState({ path })
    }

    handleClick(file: DriveFile): void {
        const plugin = this.plugin
        if (!plugin) return
        if (file.isFolder) {
            // Trail is derived from files-loaded (see nextPath). Navigating only flags
            // loading + requests the folder. (Was: pushed this.state.folder here, which
            // duplicated the seeded id → duplicate breadcrumb keys + collapsed trail.)
            this.setState({ isClickLoading: true })
            const arg = this.descriptor.folderKey === 'path' ? file.path : file.id
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
        this.setState({ showLoader: true, downloadProgress: 0 })
        try {
            await this.downloadAndClose(this.state.selectedFiles)
        } catch {
            // error surfaced via plugin event
        } finally {
            this.setState({ showLoader: false, downloadProgress: 0 })
        }
    }

    handleCancelDownload(): void {
        this.setState({ selectedFiles: [], downloadProgress: 0 })
    }

    async onSelectCurrentFolder(): Promise<void> {
        const plugin = this.plugin
        if (!plugin) return

        if (this.descriptor.selectFolder === 'cached-children') {
            const current = this.state.path[this.state.path.length - 1]
            if (!current) return
            this.setState({ showLoader: true, downloadProgress: 0 })
            try {
                await this.downloadAndClose(current.children)
            } catch {
                // error surfaced via plugin event
            } finally {
                this.setState({ showLoader: false, downloadProgress: 0 })
            }
            return
        }

        // load-all (popup providers)
        if (!plugin.loadAllFilesInFolder || !this.state.folder) return
        this.setState({ showLoader: true, downloadProgress: 0 })
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
            this.setState({ showLoader: false, downloadProgress: 0 })
        }
    }

    private async downloadAndClose(files: DriveFile[]): Promise<void> {
        const plugin = this.plugin
        if (!plugin) return
        const fileOnly = files.filter(f => !f.isFolder)
        if (fileOnly.length > 0) {
            const downloaded = await plugin.downloadFiles(fileOnly)
            if (downloaded.length > 0) this.callbacks.onFilesSelected(downloaded)
        }
        this.setState({ selectedFiles: [] })
        this.callbacks.onClose()
    }
}
