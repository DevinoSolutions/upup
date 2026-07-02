import type { EventEmitter } from '../events'
import type { DrivePlugin } from './plugin'
import type { OneDriveConfigs } from './configs'
import type { DriveFile, DriveState } from './types'

// ── Session storage keys ──
const SK_ACCESS = 'upup_onedrive_access_token'
const SK_REFRESH = 'upup_onedrive_refresh_token'
const SK_EXPIRY = 'upup_onedrive_token_expiry'

// ── Microsoft OAuth2 / Graph API endpoints ──
const AUTH_URL =
    'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
const TOKEN_URL =
    'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

const OAUTH_SCOPES = 'user.read files.readwrite.all offline_access'

const POPUP_NAME = 'UpupOneDriveAuth'

// ── Graph API query params for file listing ──
const FILE_SELECT =
    'id,name,folder,file,size,@microsoft.graph.downloadUrl'
const FILE_EXPAND = 'thumbnails'

// ── PKCE helpers ──

function generateCodeVerifier(length = 128): string {
    const charset =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    const values = crypto.getRandomValues(new Uint8Array(length))
    return Array.from(values, b => charset[b % charset.length]).join('')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
    const data = new TextEncoder().encode(verifier)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}

// ── Storage helpers (guarded for SSR) ──

function storageGet(key: string): string | null {
    if (typeof window === 'undefined') return null
    try {
        return sessionStorage.getItem(key)
    } catch {
        return null
    }
}

function storageSet(key: string, value: string): void {
    if (typeof window === 'undefined') return
    try {
        sessionStorage.setItem(key, value)
    } catch {
        // quota exceeded or private browsing — silently ignore
    }
}

function storageDel(key: string): void {
    if (typeof window === 'undefined') return
    try {
        sessionStorage.removeItem(key)
    } catch {
        // ignore
    }
}

// ── Microsoft Graph item → DriveFile mapper ──

function mapGraphItem(item: Record<string, unknown>): DriveFile {
    const isFolder = !!item.folder
    const file = item.file as Record<string, unknown> | undefined
    const mimeType = isFolder
        ? 'folder'
        : (file?.mimeType as string) ?? guessMimeType(item.name as string)

    const thumbnails = item.thumbnails as Array<Record<string, unknown>> | undefined
    let thumbnail: string | undefined
    if (thumbnails && thumbnails.length > 0) {
        const thumbSet = thumbnails[0]
        const medium = thumbSet?.medium as Record<string, unknown> | undefined
        thumbnail = (medium?.url as string) ?? undefined
    }

    return {
        id: (item.id as string) ?? '',
        name: (item.name as string) ?? '',
        path: (item.id as string) ?? '', // OneDrive uses id-based navigation
        size: isFolder ? 0 : ((item.size as number) ?? 0),
        mimeType,
        isFolder,
        thumbnail,
        modifiedAt: (item.lastModifiedDateTime as string) ?? undefined,
    }
}

function guessMimeType(name: string): string {
    if (!name) return 'application/octet-stream'
    const ext = name.split('.').pop()?.toLowerCase() ?? ''
    const map: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        txt: 'text/plain',
        csv: 'text/csv',
        json: 'application/json',
        xml: 'application/xml',
        zip: 'application/zip',
        mp3: 'audio/mpeg',
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        avi: 'video/x-msvideo',
        html: 'text/html',
        css: 'text/css',
        js: 'application/javascript',
        ts: 'application/typescript',
    }
    return map[ext] ?? 'application/octet-stream'
}

// ── OneDrivePlugin ──

export class OneDrivePlugin implements DrivePlugin {
    readonly id = 'one-drive'
    readonly name = 'one-drive'

    private emitter: EventEmitter | null = null
    private config: OneDriveConfigs = { onedrive_client_id: '' }
    private accessToken: string | null = null
    private refreshTokenValue: string | null = null
    private tokenExpiry = 0
    private state: DriveState = 'idle'
    private codeVerifier: string | null = null

    // Popup polling references
    private popupWindow: Window | null = null
    private pollTimer: ReturnType<typeof setInterval> | null = null

    // ── Plugin lifecycle ──

    configure(config: OneDriveConfigs): this {
        this.config = config
        return this
    }

    getConfig(): Readonly<OneDriveConfigs> {
        return this.config
    }

    setup(_core: unknown): void {
        // Called by PluginManager.register
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
        this.emitter?.emit('onedrive:state-change', { state: newState })
    }

    // ── Auth: build the OAuth URL with PKCE ──

    async getAuthUrl(): Promise<string> {
        const clientId = this.config.onedrive_client_id
        if (!clientId) {
            throw new Error('OneDrive client_id is not configured')
        }

        const redirectUri = this.getRedirectUri()
        this.codeVerifier = generateCodeVerifier()
        const challenge = await generateCodeChallenge(this.codeVerifier)

        const params = new URLSearchParams({
            client_id: clientId,
            response_type: 'code',
            redirect_uri: redirectUri,
            scope: OAUTH_SCOPES,
            code_challenge: challenge,
            code_challenge_method: 'S256',
            response_mode: 'query',
        })

        return `${AUTH_URL}?${params.toString()}`
    }

    // ── Auth: exchange authorization code for tokens ──

    async authenticate(code: string): Promise<void> {
        const clientId = this.config.onedrive_client_id
        if (!clientId) {
            throw new Error('OneDrive client_id is not configured')
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
                scope: OAUTH_SCOPES,
            })

            const res = await fetch(TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
                user = await this.getUserInfo()
            } catch {
                // Profile fetch is non-critical
            }

            this.setState('authenticated')
            this.emitter?.emit('onedrive:authenticated', { user })
        } catch (err) {
            this.setState('idle')
            this.emitter?.emit('onedrive:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'authenticate',
            })
            throw err
        }
    }

    // ── Auth: popup-based flow (open popup, poll for redirect code) ──

    async authenticateViaPopup(): Promise<void> {
        if (typeof window === 'undefined') {
            throw new Error('authenticateViaPopup requires a browser environment')
        }

        const url = await this.getAuthUrl()

        // Close any existing popup
        this.cleanupPopup()

        const left =
            (typeof window !== 'undefined' ? window.screenX : 0) + 60
        const top =
            (typeof window !== 'undefined' ? window.screenY : 0) + 60

        this.popupWindow = window.open(
            url,
            POPUP_NAME,
            `width=800,height=600,left=${left},top=${top},toolbar=0,scrollbars=1,status=1,resizable=1`,
        )

        if (!this.popupWindow) {
            this.emitter?.emit('onedrive:error', {
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
                        // Cross-origin while still on Microsoft domain — expected
                        return
                    }

                    if (!href.startsWith(redirectUri) || !href.includes('code=')) {
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
                        this.emitter?.emit('onedrive:error', {
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
                    this.emitter?.emit('onedrive:error', {
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
        const clientId = this.config.onedrive_client_id
        if (!clientId || !this.refreshTokenValue) return null

        try {
            const res = await fetch(TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshTokenValue,
                    client_id: clientId,
                    scope: OAUTH_SCOPES,
                }),
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(`Token refresh failed: ${text}`)
            }

            const data = await res.json()
            this.setTokens(
                data.access_token,
                data.refresh_token ?? this.refreshTokenValue,
                data.expires_in ? Date.now() + data.expires_in * 1000 : 0,
            )

            return data.access_token
        } catch (err) {
            this.emitter?.emit('onedrive:session-expired', {})
            this.emitter?.emit('onedrive:error', {
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
        this.emitter?.emit('onedrive:signed-out', {})
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

    // ── File operations: list files ──

    async loadFiles(
        folderId?: string,
    ): Promise<{
        files: DriveFile[]
        folderId: string
    }> {
        this.setState('browsing')

        try {
            const path = folderId
                ? `/me/drive/items/${folderId}/children`
                : '/me/drive/root/children'

            const params = new URLSearchParams({
                $select: FILE_SELECT,
                $expand: FILE_EXPAND,
            })

            const data = await this.graphRequest(`${path}?${params.toString()}`)
            const items: Record<string, unknown>[] = (Array.isArray(data.value) ? data.value : []) as Record<string, unknown>[]
            const files: DriveFile[] = items.map(mapGraphItem)

            this.setState('authenticated')
            this.emitter?.emit('onedrive:files-loaded', {
                files,
                folderId: folderId ?? 'root',
            })

            return { files, folderId: folderId ?? 'root' }
        } catch (err) {
            this.setState('authenticated')
            this.emitter?.emit('onedrive:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'loadFiles',
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
                    this.emitter?.emit('onedrive:file-downloaded', {
                        file,
                        driveFile,
                    })
                }
            } catch (err) {
                this.emitter?.emit('onedrive:error', {
                    error: err instanceof Error ? err : new Error(String(err)),
                    action: 'downloadFiles',
                })
                // Continue downloading remaining files
            }
        }

        return results
    }

    // ── File operations: load all files in folder recursively ──

    async loadAllFilesInFolder(folderId: string): Promise<DriveFile[]> {
        const allFiles: DriveFile[] = []

        try {
            const { files } = await this.loadFiles(folderId)
            for (const file of files) {
                if (file.isFolder) {
                    const nested = await this.loadAllFilesInFolder(file.id)
                    allFiles.push(...nested)
                } else {
                    allFiles.push(file)
                }
            }
            return allFiles
        } catch (err) {
            this.emitter?.emit('onedrive:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'loadAllFilesInFolder',
            })
            throw err
        }
    }

    // ── User profile ──

    async getUserInfo(): Promise<{ name: string; email: string }> {
        const data = await this.graphRequest('/me')
        return {
            name: String(data.displayName ?? ''),
            email: String(data.mail ?? data.userPrincipalName ?? ''),
        }
    }

    // ── Private: Microsoft Graph API request with auto-refresh ──

    private async graphRequest(
        path: string,
        options: RequestInit = {},
        isRetry = false,
    ): Promise<Record<string, unknown>> {
        await this.ensureValidToken()

        const url = path.startsWith('http') ? path : `${GRAPH_BASE}${path}`
        const headers = new Headers(options.headers ?? {})
        headers.set('Authorization', `Bearer ${this.accessToken}`)

        const res = await fetch(url, { ...options, headers })

        if (res.ok) {
            return res.json()
        }

        const errorText = await res.text()

        // Handle 401 — attempt token refresh
        if (res.status === 401 && !isRetry) {
            if (this.refreshTokenValue) {
                const newToken = await this.refreshAccessToken()
                if (newToken) {
                    return this.graphRequest(path, options, true)
                }
            }

            // No refresh token or refresh failed
            this.emitter?.emit('onedrive:session-expired', {})
            this.clearTokens()
            this.setState('session-expired')
        }

        throw new Error(
            `OneDrive API error (${res.status}): ${errorText}`,
        )
    }

    // ── Private: download a single file ──

    private async downloadSingleFile(driveFile: DriveFile): Promise<File | null> {
        // First try to get the download URL from item metadata
        const itemData = await this.graphRequest(
            `/me/drive/items/${driveFile.id}?select=@microsoft.graph.downloadUrl`,
        )

        const downloadUrl =
            (itemData['@microsoft.graph.downloadUrl'] as string) ??
            (itemData['@content.downloadUrl'] as string)

        if (!downloadUrl) {
            throw new Error(`No download URL available for ${driveFile.name}`)
        }

        // Download the file content via the download URL (no auth needed)
        const downloadRes = await fetch(downloadUrl, { method: 'GET' })
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
            return `${window.location.origin}/od_redirect`
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
