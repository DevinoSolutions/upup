import type { EventEmitter } from '../events'
import type { DrivePlugin } from './plugin'
import type { BoxConfig } from './configs'
import type { DriveFile, DriveState } from './types'

// ── Session storage keys ──
const SK_ACCESS = 'upup_box_access_token'
const SK_REFRESH = 'upup_box_refresh_token'

// ── Box API endpoints ──
const AUTH_URL = 'https://account.box.com/api/oauth2/authorize'
const TOKEN_URL = 'https://api.box.com/oauth2/token'
const USER_URL = 'https://api.box.com/2.0/users/me'
const FOLDERS_URL = 'https://api.box.com/2.0/folders'
const FILES_URL = 'https://api.box.com/2.0/files'
const SEARCH_URL = 'https://api.box.com/2.0/search'

const POPUP_NAME = 'UpupBoxAuth'

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

// ── Box entry → DriveFile mapper ──

function mapEntry(entry: Record<string, unknown>): DriveFile {
    const type = entry.type as string
    const isFolder = type === 'folder'
    return {
        id: (entry.id as string) ?? '',
        name: (entry.name as string) ?? '',
        path: (entry.id as string) ?? '', // Box uses IDs for navigation, not paths
        size: isFolder ? 0 : ((entry.size as number) ?? 0),
        mimeType: isFolder ? 'folder' : guessMimeType(entry.name as string),
        isFolder,
        thumbnail: undefined,
        modifiedAt: (entry.modified_at as string) ?? undefined,
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

// ── BoxPlugin ──

export class BoxPlugin implements DrivePlugin {
    readonly id = 'box'
    readonly name = 'box'

    private emitter: EventEmitter | null = null
    private config: BoxConfig = { clientId: '' }
    private accessToken: string | null = null
    private refreshTokenValue: string | null = null
    private state: DriveState = 'idle'
    private codeVerifier: string | null = null

    // Popup polling references
    private popupWindow: Window | null = null
    private pollTimer: ReturnType<typeof setInterval> | null = null

    // ── Plugin lifecycle ──

    configure(config: BoxConfig): this {
        this.config = config
        return this
    }

    getConfig(): Readonly<BoxConfig> {
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
        this.emitter?.emit('box:state-change', { state: newState })
    }

    // ── Auth: build the OAuth URL with PKCE ──

    async getAuthUrl(): Promise<string> {
        const clientId = this.config.clientId
        if (!clientId) {
            throw new Error('Box client_id is not configured')
        }

        const redirectUri = this.getRedirectUri()
        this.codeVerifier = generateCodeVerifier()
        const challenge = await generateCodeChallenge(this.codeVerifier)

        const params = new URLSearchParams({
            client_id: clientId,
            response_type: 'code',
            redirect_uri: redirectUri,
            code_challenge: challenge,
            code_challenge_method: 'S256',
        })

        return `${AUTH_URL}?${params.toString()}`
    }

    // ── Auth: exchange authorization code for tokens ──

    async authenticate(code: string): Promise<void> {
        const clientId = this.config.clientId
        if (!clientId) {
            throw new Error('Box client_id is not configured')
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
            )

            // Fetch user profile
            let user: { name: string; email: string } | undefined
            try {
                user = await this.fetchUserProfile()
            } catch {
                // Profile fetch is non-critical
            }

            this.setState('authenticated')
            this.emitter?.emit('box:authenticated', { user })
        } catch (err) {
            this.setState('idle')
            this.emitter?.emit('box:error', {
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
            this.emitter?.emit('box:error', {
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
                        // Cross-origin while still on Box domain — expected
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
                        this.emitter?.emit('box:error', {
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
                    this.emitter?.emit('box:error', {
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
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
                data.refresh_token ?? this.refreshTokenValue,
            )

            return data.access_token
        } catch (err) {
            this.emitter?.emit('box:session-expired', {})
            this.emitter?.emit('box:error', {
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
        this.emitter?.emit('box:signed-out', {})
    }

    // ── Auth: restore session from sessionStorage ──

    restoreSession(): boolean {
        const token = storageGet(SK_ACCESS)
        const refresh = storageGet(SK_REFRESH)

        if (!token) return false

        this.accessToken = token
        this.refreshTokenValue = refresh
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

    async loadFiles(
        folderId = '0',
    ): Promise<{
        files: DriveFile[]
        folderId: string
    }> {
        this.setState('browsing')

        try {
            const params = new URLSearchParams({
                fields: 'id,name,type,size,modified_at',
                limit: '1000',
            })

            const res = await this.apiRequest(
                `${FOLDERS_URL}/${folderId}/items?${params.toString()}`,
                { method: 'GET' },
            )

            const data = await res.json()
            const files: DriveFile[] = (data.entries ?? []).map(mapEntry)

            this.setState('authenticated')
            this.emitter?.emit('box:files-loaded', { files, folderId })

            return { files, folderId }
        } catch (err) {
            this.setState('authenticated')
            this.emitter?.emit('box:error', {
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
                }
            } catch (err) {
                this.emitter?.emit('box:error', {
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
            this.emitter?.emit('box:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'loadAllFilesInFolder',
            })
            throw err
        }
    }

    // ── File operations: search ──

    async searchFiles(query: string): Promise<DriveFile[]> {
        try {
            const params = new URLSearchParams({
                query,
                fields: 'id,name,type,size,modified_at',
                limit: '100',
            })

            const res = await this.apiRequest(
                `${SEARCH_URL}?${params.toString()}`,
                { method: 'GET' },
            )

            const data = await res.json()
            const entries = data.entries ?? []
            return entries.map(mapEntry)
        } catch (err) {
            this.emitter?.emit('box:error', {
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
        if (!this.accessToken) {
            throw new Error('Not authenticated — no access token')
        }

        const headers = new Headers(options.headers ?? {})
        headers.set('Authorization', `Bearer ${this.accessToken}`)

        const res = await fetch(url, { ...options, headers })

        if (res.ok) return res

        const errorText = await res.text()

        // Handle 401 — attempt token refresh
        if (res.status === 401 && !isRetry) {
            if (this.refreshTokenValue) {
                const newToken = await this.refreshAccessToken()
                if (newToken) {
                    return this.apiRequest(url, options, true)
                }
            }

            // No refresh token or refresh failed
            this.emitter?.emit('box:session-expired', {})
            this.clearTokens()
            this.setState('session-expired')
        }

        throw new Error(
            `Box API error (${res.status}): ${errorText}`,
        )
    }

    // ── Private: download a single file ──

    private async downloadSingleFile(driveFile: DriveFile): Promise<File | null> {
        const res = await this.apiRequest(
            `${FILES_URL}/${driveFile.id}/content`,
            { method: 'GET' },
        )

        const blob = await res.blob()
        return new File([blob], driveFile.name, {
            type: blob.type || driveFile.mimeType || 'application/octet-stream',
        })
    }

    // ── Private: fetch user profile ──

    private async fetchUserProfile(): Promise<{
        name: string
        email: string
    }> {
        const res = await this.apiRequest(USER_URL, { method: 'GET' })
        const data = await res.json()
        return {
            name: data.name ?? '',
            email: data.login ?? '',
        }
    }

    // ── Private: token management ──

    private setTokens(
        access: string,
        refresh: string | null,
    ): void {
        this.accessToken = access
        this.refreshTokenValue = refresh

        storageSet(SK_ACCESS, access)
        if (refresh) storageSet(SK_REFRESH, refresh)
    }

    private clearTokens(): void {
        this.accessToken = null
        this.refreshTokenValue = null
        storageDel(SK_ACCESS)
        storageDel(SK_REFRESH)
    }

    // ── Private: redirect URI ──

    private getRedirectUri(): string {
        if (this.config.redirectUri) {
            return this.config.redirectUri
        }
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/box_redirect`
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
