import type { EventEmitter } from '../events'
import type { DrivePlugin } from './plugin'
import type { DropboxConfig } from './configs'
import type { DriveFile, DriveState } from './types'
import { generateCodeVerifier, generateCodeChallenge } from './pkce'
import { storageGet, storageSet, storageDel } from './session-storage'
import { guessMimeType } from './mime'

// ── Session storage keys ──
const SK_ACCESS = 'upup_dropbox_access_token'
const SK_REFRESH = 'upup_dropbox_refresh_token'
const SK_EXPIRY = 'upup_dropbox_token_expiry'

// ── Dropbox API endpoints ──
const AUTH_URL = 'https://www.dropbox.com/oauth2/authorize'
const TOKEN_URL = 'https://api.dropbox.com/oauth2/token'
const LIST_FOLDER_URL = 'https://api.dropbox.com/2/files/list_folder'
const LIST_FOLDER_CONTINUE_URL =
    'https://api.dropbox.com/2/files/list_folder/continue'
const DOWNLOAD_URL = 'https://content.dropboxapi.com/2/files/download'
const SEARCH_URL = 'https://api.dropbox.com/2/files/search_v2'
const USER_INFO_URL = 'https://api.dropbox.com/2/users/get_current_account'
const TEMP_LINK_URL = 'https://api.dropbox.com/2/files/get_temporary_link'

const OAUTH_SCOPES =
    'files.metadata.read files.content.read files.content.write account_info.read'

const POPUP_NAME = 'UpupDropboxAuth'

// ── Dropbox entry → DriveFile mapper ──

function mapEntry(entry: Record<string, unknown>): DriveFile {
    const tag = entry['.tag'] as string
    const isFolder = tag === 'folder'
    return {
        id: (entry.id as string) ?? '',
        name: (entry.name as string) ?? '',
        path: (entry.path_display as string) ?? '',
        size: isFolder ? 0 : ((entry.size as number) ?? 0),
        mimeType: isFolder ? 'folder' : guessMimeType(entry.name as string),
        isFolder,
        thumbnail: undefined,
        modifiedAt: (entry.server_modified as string) ?? undefined,
    }
}

// ── DropboxPlugin ──

export class DropboxPlugin implements DrivePlugin {
    readonly id = 'dropbox'
    readonly name = 'dropbox'

    private emitter: EventEmitter | null = null
    private config: DropboxConfig = { clientId: '' }
    private accessToken: string | null = null
    private refreshTokenValue: string | null = null
    private tokenExpiry = 0
    private state: DriveState = 'idle'
    private codeVerifier: string | null = null

    // Popup polling references
    private popupWindow: Window | null = null
    private pollTimer: ReturnType<typeof setInterval> | null = null

    // ── Plugin lifecycle ──

    configure(config: DropboxConfig): this {
        this.config = config
        return this
    }

    getConfig(): Readonly<DropboxConfig> {
        return this.config
    }

    init(emitter: EventEmitter): void {
        this.emitter = emitter
    }

    destroy(): void {
        this.cleanupPopup()
        this.emitter = null
    }

    // ── State management ──

    getState(): DriveState {
        return this.state
    }

    private setState(newState: DriveState): void {
        this.state = newState
        this.emitter?.emit('dropbox:state-change', { state: newState })
    }

    // ── Auth: build the OAuth URL with PKCE ──

    async getAuthUrl(): Promise<string> {
        const clientId = this.config.clientId
        if (!clientId) {
            throw new Error('Dropbox client_id is not configured')
        }

        const redirectUri = this.getRedirectUri()
        this.codeVerifier = generateCodeVerifier()
        const challenge = await generateCodeChallenge(this.codeVerifier)

        const params = new URLSearchParams({
            client_id: clientId,
            response_type: 'code',
            redirect_uri: redirectUri,
            token_access_type: 'offline',
            scope: OAUTH_SCOPES,
            code_challenge: challenge,
            code_challenge_method: 'S256',
        })

        return `${AUTH_URL}?${params.toString()}`
    }

    // ── Auth: exchange authorization code for tokens ──

    async authenticate(code: string): Promise<void> {
        const clientId = this.config.clientId
        if (!clientId) {
            throw new Error('Dropbox client_id is not configured')
        }
        if (!this.codeVerifier) {
            throw new Error('No PKCE code verifier — call getAuthUrl() first')
        }

        this.setState('authenticating')

        try {
            const body = new URLSearchParams({
                code,
                client_id: clientId,
                code_verifier: this.codeVerifier,
                grant_type: 'authorization_code',
                redirect_uri: this.getRedirectUri(),
            })

            const res = await fetch(TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body,
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(`Token exchange failed: ${text}`)
            }

            const data = await res.json()
            this.setTokens(
                data.access_token,
                data.refresh_token ?? null,
                data.expires_in ? Date.now() + data.expires_in * 1000 : 0,
            )

            // Fetch user profile
            let user: { name: string; email: string } | undefined
            try {
                user = await this.fetchUserProfile()
            } catch {
                // Profile fetch is non-critical
            }

            this.setState('authenticated')
            this.emitter?.emit('dropbox:authenticated', { user })
        } catch (err) {
            this.setState('idle')
            this.emitter?.emit('dropbox:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'authenticate',
            })
            throw err
        }
    }

    // ── Auth: popup-based flow (open popup, poll for redirect code) ──

    async authenticateViaPopup(): Promise<void> {
        if (typeof window === 'undefined') {
            throw new Error(
                'authenticateViaPopup requires a browser environment',
            )
        }

        const url = await this.getAuthUrl()

        // Close any existing popup
        this.cleanupPopup()

        const left = (typeof window !== 'undefined' ? window.screenX : 0) + 60
        const top = (typeof window !== 'undefined' ? window.screenY : 0) + 60

        this.popupWindow = window.open(
            url,
            POPUP_NAME,
            `width=800,height=600,left=${left},top=${top},toolbar=0,scrollbars=1,status=1,resizable=1`,
        )

        if (!this.popupWindow) {
            this.emitter?.emit('dropbox:error', {
                error: new Error('Popup was blocked by the browser'),
                action: 'authenticateViaPopup',
            })
            throw new Error('Popup was blocked by the browser')
        }

        this.setState('authenticating')

        return new Promise<void>((resolve, reject) => {
            const redirectUri = this.getRedirectUri()

            this.pollTimer = setInterval(async () => {
                try {
                    if (!this.popupWindow || this.popupWindow.closed) {
                        this.cleanupPopup()
                        this.setState('idle')
                        resolve() // User closed popup — not an error
                        return
                    }

                    let href: string
                    try {
                        href = this.popupWindow.location.href
                    } catch {
                        // Cross-origin while still on Dropbox domain — expected
                        return
                    }

                    if (
                        !href.startsWith(redirectUri) ||
                        !href.includes('code=')
                    ) {
                        return
                    }

                    // Got the redirect with the code
                    this.cleanupPollTimer()

                    const code = new URL(href).searchParams.get('code')
                    this.popupWindow.close()
                    this.popupWindow = null

                    if (!code) {
                        const err = new Error(
                            'No authorization code found in redirect URL',
                        )
                        this.setState('idle')
                        this.emitter?.emit('dropbox:error', {
                            error: err,
                            action: 'authenticateViaPopup',
                        })
                        reject(err)
                        return
                    }

                    await this.authenticate(code)
                    resolve()
                } catch (err) {
                    const message = (err as Error).message ?? ''

                    // Ignore cross-origin errors — they're expected while polling
                    if (
                        message.includes('cross-origin') ||
                        message.includes('Cross-Origin') ||
                        message.includes('Permission denied') ||
                        message.includes('Failed to read')
                    ) {
                        return
                    }

                    this.cleanupPopup()
                    this.setState('idle')
                    this.emitter?.emit('dropbox:error', {
                        error:
                            err instanceof Error ? err : new Error(String(err)),
                        action: 'authenticateViaPopup',
                    })
                    reject(err)
                }
            }, 500)
        })
    }

    // ── Auth: refresh access token ──

    async refreshAccessToken(): Promise<string | null> {
        const clientId = this.config.clientId
        if (!clientId || !this.refreshTokenValue) return null

        try {
            const res = await fetch(TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshTokenValue,
                    client_id: clientId,
                }),
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(`Token refresh failed: ${text}`)
            }

            const data = await res.json()
            this.setTokens(
                data.access_token,
                this.refreshTokenValue, // Refresh token stays the same
                data.expires_in ? Date.now() + data.expires_in * 1000 : 0,
            )

            return data.access_token
        } catch (err) {
            this.emitter?.emit('dropbox:session-expired', {})
            this.emitter?.emit('dropbox:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'refreshAccessToken',
            })
            this.clearTokens()
            this.setState('session-expired')
            return null
        }
    }

    // ── Auth: sign out ──

    signOut(): void {
        this.clearTokens()
        this.cleanupPopup()
        this.setState('idle')
        this.emitter?.emit('dropbox:signed-out', {})
    }

    // ── Auth: restore session from sessionStorage ──

    restoreSession(): boolean {
        const token = storageGet(SK_ACCESS)
        const refresh = storageGet(SK_REFRESH)
        const expiry = storageGet(SK_EXPIRY)

        if (!token) return false

        this.accessToken = token
        this.refreshTokenValue = refresh
        this.tokenExpiry = expiry ? parseInt(expiry, 10) : 0
        this.setState('authenticated')
        return true
    }

    // ── Auth helpers ──

    isAuthenticated(): boolean {
        return this.state === 'authenticated' && this.accessToken !== null
    }

    getAccessToken(): string | null {
        return this.accessToken
    }

    async getUserInfo(): Promise<{ name: string; email: string } | null> {
        if (!this.isAuthenticated()) return null
        try {
            return await this.fetchUserProfile()
        } catch {
            return null
        }
    }

    // ── File operations: list folder ──

    async loadFiles(path = ''): Promise<{
        files: DriveFile[]
        hasMore: boolean
        cursor?: string
    }> {
        this.setState('browsing')

        try {
            const res = await this.apiRequest(LIST_FOLDER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path,
                    recursive: false,
                    include_media_info: true,
                    include_deleted: false,
                    include_has_explicit_shared_members: false,
                }),
            })

            const data = await res.json()
            const files: DriveFile[] = (data.entries ?? []).map(mapEntry)

            this.setState('authenticated')
            this.emitter?.emit('dropbox:files-loaded', {
                files,
                path,
                hasMore: !!data.has_more,
                cursor: data.cursor,
            })

            return { files, hasMore: !!data.has_more, cursor: data.cursor }
        } catch (err) {
            this.setState('authenticated')
            this.emitter?.emit('dropbox:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'loadFiles',
            })
            throw err
        }
    }

    // ── File operations: continue listing (pagination) ──

    async loadMoreFiles(cursor: string): Promise<{
        files: DriveFile[]
        hasMore: boolean
        cursor?: string
    }> {
        try {
            const res = await this.apiRequest(LIST_FOLDER_CONTINUE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cursor }),
            })

            const data = await res.json()
            const files: DriveFile[] = (data.entries ?? []).map(mapEntry)

            // No files-loaded emit here: the controller's loadMore() appends this
            // return value directly (F-125) — re-emitting would make the controller
            // process it a second time as if it were a fresh folder load.
            return { files, hasMore: !!data.has_more, cursor: data.cursor }
        } catch (err) {
            this.emitter?.emit('dropbox:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'loadMoreFiles',
            })
            throw err
        }
    }

    // ── File operations: load all files in folder recursively ──

    async loadAllFilesInFolder(folderPath: string): Promise<DriveFile[]> {
        const allFiles: DriveFile[] = []

        try {
            const initialRes = await this.apiRequest(LIST_FOLDER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: folderPath,
                    recursive: true,
                    include_media_info: true,
                }),
            })

            let data = await initialRes.json()
            const entries: Record<string, unknown>[] = data.entries ?? []

            while (data.has_more) {
                const contRes = await this.apiRequest(
                    LIST_FOLDER_CONTINUE_URL,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cursor: data.cursor }),
                    },
                )
                data = await contRes.json()
                entries.push(...(data.entries ?? []))
            }

            for (const entry of entries) {
                const file = mapEntry(entry)
                if (!file.isFolder) allFiles.push(file)
            }

            return allFiles
        } catch (err) {
            this.emitter?.emit('dropbox:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'loadAllFilesInFolder',
            })
            throw err
        }
    }

    // ── File operations: download files ──

    async downloadFiles(driveFiles: DriveFile[]): Promise<File[]> {
        const results: File[] = []

        for (const driveFile of driveFiles) {
            if (driveFile.isFolder) continue

            try {
                const file = await this.downloadSingleFile(driveFile)
                if (file) {
                    results.push(file)
                }
            } catch (err) {
                this.emitter?.emit('dropbox:error', {
                    error: err instanceof Error ? err : new Error(String(err)),
                    action: 'downloadFiles',
                })
                // Continue downloading remaining files
            }
        }

        return results
    }

    // ── File operations: search ──

    async searchFiles(query: string, path?: string): Promise<DriveFile[]> {
        try {
            const body: Record<string, unknown> = {
                query,
                options: {
                    max_results: 100,
                    file_status: { '.tag': 'active' },
                },
            }
            if (path) {
                body.options = {
                    ...(body.options as object),
                    path,
                }
            }

            const res = await this.apiRequest(SEARCH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            const data = await res.json()
            const matches = data.matches ?? []
            return matches.map(
                (m: { metadata: { metadata: Record<string, unknown> } }) =>
                    mapEntry(m.metadata.metadata),
            )
        } catch (err) {
            this.emitter?.emit('dropbox:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'searchFiles',
            })
            throw err
        }
    }

    // ── Private: authenticated API request with auto-refresh ──

    private async apiRequest(
        url: string,
        options: RequestInit,
        isRetry = false,
    ): Promise<Response> {
        await this.ensureValidToken()

        const headers = new Headers(options.headers ?? {})
        headers.set('Authorization', `Bearer ${this.accessToken}`)

        const res = await fetch(url, { ...options, headers })

        if (res.ok) return res

        const errorText = await res.text()

        // Handle 401 — attempt token refresh
        if (res.status === 401 && !isRetry) {
            const isExpired =
                errorText.includes('expired_access_token') || res.status === 401

            if (isExpired && this.refreshTokenValue) {
                const newToken = await this.refreshAccessToken()
                if (newToken) {
                    return this.apiRequest(url, options, true)
                }
            }

            // No refresh token or refresh failed
            this.emitter?.emit('dropbox:session-expired', {})
            this.clearTokens()
            this.setState('session-expired')
        }

        throw new Error(`Dropbox API error (${res.status}): ${errorText}`)
    }

    // ── Private: download a single file via temporary link ──

    private async downloadSingleFile(
        driveFile: DriveFile,
    ): Promise<File | null> {
        // Get temporary download link
        const linkRes = await this.apiRequest(TEMP_LINK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: driveFile.path }),
        })

        const linkData = await linkRes.json()
        const downloadLink: string = linkData.link

        if (!downloadLink) {
            throw new Error(`No download link returned for ${driveFile.name}`)
        }

        // Download the file content via the temporary link
        const downloadRes = await fetch(downloadLink, { method: 'GET' })
        if (!downloadRes.ok) {
            throw new Error(
                `Download failed (${downloadRes.status}) for ${driveFile.name}`,
            )
        }

        const blob = await downloadRes.blob()
        return new File([blob], driveFile.name, {
            type: blob.type || driveFile.mimeType || 'application/octet-stream',
        })
    }

    // ── Private: fetch user profile ──

    private async fetchUserProfile(): Promise<{
        name: string
        email: string
    }> {
        const res = await this.apiRequest(USER_INFO_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: null,
        })

        const data = await res.json()
        return {
            name: data.name?.display_name ?? '',
            email: data.email ?? '',
        }
    }

    // ── Private: token management ──

    private setTokens(
        access: string,
        refresh: string | null,
        expiry: number,
    ): void {
        this.accessToken = access
        this.refreshTokenValue = refresh
        this.tokenExpiry = expiry

        storageSet(SK_ACCESS, access)
        if (refresh) storageSet(SK_REFRESH, refresh)
        if (expiry) storageSet(SK_EXPIRY, String(expiry))
    }

    private clearTokens(): void {
        this.accessToken = null
        this.refreshTokenValue = null
        this.tokenExpiry = 0
        storageDel(SK_ACCESS)
        storageDel(SK_REFRESH)
        storageDel(SK_EXPIRY)
    }

    private async ensureValidToken(): Promise<void> {
        if (!this.accessToken) {
            throw new Error('Not authenticated — no access token')
        }

        // If token expires within 60s, proactively refresh
        if (
            this.tokenExpiry > 0 &&
            Date.now() > this.tokenExpiry - 60_000 &&
            this.refreshTokenValue
        ) {
            await this.refreshAccessToken()
        }
    }

    // ── Private: redirect URI ──

    private getRedirectUri(): string {
        if (this.config.redirectUri) {
            return this.config.redirectUri
        }
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/dp_redirect`
        }
        return ''
    }

    // ── Private: popup cleanup ──

    private cleanupPopup(): void {
        this.cleanupPollTimer()
        if (this.popupWindow && !this.popupWindow.closed) {
            this.popupWindow.close()
        }
        this.popupWindow = null
    }

    private cleanupPollTimer(): void {
        if (this.pollTimer) {
            clearInterval(this.pollTimer)
            this.pollTimer = null
        }
    }
}
