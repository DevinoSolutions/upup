import type { EventEmitter } from '../events'
import type { DrivePlugin } from './plugin'
import type { DriveFile, DriveState, DriveUser } from './types'
import { generateCodeVerifier, generateCodeChallenge } from './pkce'
import { storageGet, storageSet, storageDel } from './session-storage'
import { UpupAuthError, UpupNetworkError } from '../errors'

/**
 * The fields this class reads off an OAuth2 token-endpoint response (RFC 6749 §5.1),
 * shared by the authorization-code exchange and the refresh-token exchange.
 */
interface OAuthTokenResponse {
    access_token: string
    refresh_token?: string
    expires_in?: number
}

/**
 * Shared config for the popup-OAuth providers (Box / OneDrive / Dropbox). All
 * three declare exactly this shape (`{ clientId, redirectUri? }`) — see
 * `configs.ts`; the subclasses re-export their own alias for public ergonomics.
 */
export interface DriveOAuthConfig {
    clientId: string
    redirectUri?: string
}

/**
 * Per-provider configuration for a {@link PopupOAuthPlugin} subclass. Everything
 * that differs between Box, OneDrive, and Dropbox at the auth/popup/refresh layer
 * is data here — the skeleton itself is provider-agnostic.
 */
export interface PopupOAuthSpec {
    /** Stable plugin id, e.g. 'box' / 'one-drive' / 'dropbox'. */
    id: string
    /** Human-facing provider name used in diagnostic error messages, e.g. 'Box' / 'OneDrive' / 'Dropbox'. */
    displayName: string
    /** Event namespace: emits `${eventPrefix}:state-change`, `:authenticated`, `:session-expired`, `:error`, `:signed-out`, `:files-loaded`. */
    eventPrefix: string
    /** window.open target name, e.g. 'UpupBoxAuth'. */
    popupName: string
    /** OAuth2 authorize endpoint. */
    authUrl: string
    /** OAuth2 token endpoint. */
    tokenUrl: string
    /** Default redirect path appended to `window.location.origin`, e.g. '/box_redirect'. */
    redirectPath: string
    /** sessionStorage keys for the access / refresh tokens and the absolute expiry ms. */
    storageKeys: { access: string; refresh: string; expiry: string }
    /** Space-joined OAuth scopes. Omitted by Box (its scopes are app-configured). */
    scopes?: string
    /** Extra provider params merged onto the authorize URL (e.g. MS `response_mode`, Dropbox `token_access_type`). */
    authParams?: Record<string, string>
}

/**
 * Abstract base owning the popup-OAuth / PKCE / token-refresh / lifecycle skeleton
 * shared byte-for-byte across the three client-mode popup providers (F-121). A
 * concrete provider supplies (a) a {@link PopupOAuthSpec} and (b) its genuinely
 * provider-specific domain methods (`mapEntry`, `fetchUserProfile`, `loadFiles`,
 * `downloadFiles`, …), which are moved verbatim from the hand-written plugins.
 *
 * The one intended behavior change vs. the pre-extraction plugins is that Box now
 * inherits proactive token refresh + persisted expiry (F-126) — OneDrive/Dropbox
 * already had it.
 *
 * Not for GoogleDrive: its GIS access-token model has no PKCE popup and no refresh
 * token, so it stays a standalone `implements DrivePlugin`.
 */
export abstract class PopupOAuthPlugin implements DrivePlugin {
    abstract readonly spec: PopupOAuthSpec

    get id(): string {
        return this.spec.id
    }

    get name(): string {
        return this.spec.id
    }

    protected emitter: EventEmitter | null = null
    protected config: DriveOAuthConfig = { clientId: '' }
    protected accessToken: string | null = null
    protected refreshTokenValue: string | null = null
    protected tokenExpiry = 0
    protected state: DriveState = 'idle'
    private codeVerifier: string | null = null

    // Popup polling references
    private popupWindow: Window | null = null
    private pollTimer: ReturnType<typeof setInterval> | null = null

    // ── Plugin lifecycle ──

    configure(config: DriveOAuthConfig): this {
        this.config = config
        return this
    }

    getConfig(): Readonly<DriveOAuthConfig> {
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

    protected setState(newState: DriveState): void {
        this.state = newState
        this.emitter?.emit(`${this.spec.eventPrefix}:state-change`, {
            state: newState,
        })
    }

    // ── Auth: build the OAuth URL with PKCE ──

    async getAuthUrl(): Promise<string> {
        const clientId = this.config.clientId
        if (!clientId) {
            throw new UpupAuthError(
                `${this.spec.displayName} client_id is not configured`,
                this.spec.displayName,
            )
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
            ...(this.spec.authParams ?? {}),
        })
        if (this.spec.scopes) {
            params.set('scope', this.spec.scopes)
        }

        return `${this.spec.authUrl}?${params.toString()}`
    }

    // ── Auth: exchange authorization code for tokens ──

    async authenticate(code: string): Promise<void> {
        const clientId = this.config.clientId
        if (!clientId) {
            throw new UpupAuthError(
                `${this.spec.displayName} client_id is not configured`,
                this.spec.displayName,
            )
        }
        if (!this.codeVerifier) {
            throw new UpupAuthError(
                'No PKCE code verifier — call getAuthUrl() first',
                this.spec.displayName,
            )
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
            if (this.spec.scopes) {
                body.set('scope', this.spec.scopes)
            }

            const res = await fetch(this.spec.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body,
            })

            if (!res.ok) {
                const text = await res.text()
                throw new UpupAuthError(
                    `Token exchange failed: ${text}`,
                    this.spec.displayName,
                )
            }

            const data = (await res.json()) as OAuthTokenResponse
            this.setTokens(
                data.access_token,
                data.refresh_token ?? null,
                data.expires_in,
            )

            // Fetch user profile. Calls the protected fetchUserProfile(), not the
            // public getUserInfo() — isAuthenticated() (gating getUserInfo since
            // F-123) doesn't flip true until this.setState('authenticated') below.
            let user: DriveUser | undefined
            try {
                user = await this.fetchUserProfile()
            } catch {
                // upup-catch: profile fetch is non-critical — authenticated event still emits without a user
            }

            this.setState('authenticated')
            this.emitter?.emit(`${this.spec.eventPrefix}:authenticated`, {
                user,
            })
        } catch (err) {
            this.setState('idle')
            this.emitter?.emit(`${this.spec.eventPrefix}:error`, {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'authenticate',
            })
            throw err
        }
    }

    // ── Auth: popup-based flow (open popup, poll for redirect code) ──

    async authenticateViaPopup(): Promise<void> {
        if (typeof window === 'undefined') {
            throw new UpupAuthError(
                'authenticateViaPopup requires a browser environment',
                this.spec.displayName,
            )
        }

        const url = await this.getAuthUrl()

        // Close any existing popup
        this.cleanupPopup()

        const left = (typeof window !== 'undefined' ? window.screenX : 0) + 60
        const top = (typeof window !== 'undefined' ? window.screenY : 0) + 60

        this.popupWindow = window.open(
            url,
            this.spec.popupName,
            `width=800,height=600,left=${left},top=${top},toolbar=0,scrollbars=1,status=1,resizable=1`,
        )

        if (!this.popupWindow) {
            this.emitter?.emit(`${this.spec.eventPrefix}:error`, {
                error: new Error('Popup was blocked by the browser'),
                action: 'authenticateViaPopup',
            })
            throw new UpupAuthError(
                'Popup was blocked by the browser',
                this.spec.displayName,
            )
        }

        this.setState('authenticating')

        return new Promise<void>((resolve, reject) => {
            const redirectUri = this.getRedirectUri()

            this.pollTimer = setInterval(() => {
                void (async (): Promise<void> => {
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
                            // upup-catch: cross-origin read while still on the provider's domain — expected until the redirect lands
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
                            this.emitter?.emit(
                                `${this.spec.eventPrefix}:error`,
                                {
                                    error: err,
                                    action: 'authenticateViaPopup',
                                },
                            )
                            reject(err)
                            return
                        }

                        await this.authenticate(code)
                        resolve()
                    } catch (err) {
                        const message =
                            err instanceof Error ? err.message : String(err)

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
                        // upup-catch: real popup-poll failure — emitted via the provider's error event and rejected to the authenticateViaPopup() caller
                        this.emitter?.emit(`${this.spec.eventPrefix}:error`, {
                            error:
                                err instanceof Error
                                    ? err
                                    : new Error(String(err)),
                            action: 'authenticateViaPopup',
                        })
                        reject(err instanceof Error ? err : new Error(message))
                    }
                })()
            }, 500)
        })
    }

    // ── Auth: refresh access token ──

    async refreshAccessToken(): Promise<string | null> {
        const clientId = this.config.clientId
        if (!clientId || !this.refreshTokenValue) return null

        try {
            const body = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: this.refreshTokenValue,
                client_id: clientId,
            })
            if (this.spec.scopes) {
                body.set('scope', this.spec.scopes)
            }

            const res = await fetch(this.spec.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body,
            })

            if (!res.ok) {
                const text = await res.text()
                throw new UpupAuthError(
                    `Token refresh failed: ${text}`,
                    this.spec.displayName,
                )
            }

            const data = (await res.json()) as OAuthTokenResponse
            this.setTokens(
                data.access_token,
                data.refresh_token ?? this.refreshTokenValue,
                data.expires_in,
            )

            return data.access_token
        } catch (err) {
            // upup-catch: refresh failure already emitted via the provider's
            // session-expired + error events; the null return signals the
            // caller (apiRequest/ensureValidToken) that refresh did not succeed.
            this.emitter?.emit(`${this.spec.eventPrefix}:session-expired`, {})
            this.emitter?.emit(`${this.spec.eventPrefix}:error`, {
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
        this.emitter?.emit(`${this.spec.eventPrefix}:signed-out`, {})
    }

    // ── Auth: restore session from sessionStorage ──

    restoreSession(): boolean {
        const token = storageGet(this.spec.storageKeys.access)
        const refresh = storageGet(this.spec.storageKeys.refresh)
        const expiry = storageGet(this.spec.storageKeys.expiry)

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

    // Guarded public entry point the controller drives (F-123): swallow-to-null
    // instead of throwing, so a failed profile fetch never strands the restore
    // flow in an unhandled rejection. Requires isAuthenticated() — unlike
    // authenticate()'s internal call, which fetches before the flag flips.
    async getUserInfo(): Promise<DriveUser | null> {
        if (!this.isAuthenticated()) return null
        try {
            return await this.fetchUserProfile()
        } catch {
            // upup-catch: F-123 — swallow to null so a failed profile fetch never
            // strands the restore flow in an unhandled rejection
            return null
        }
    }

    // ── Private: authenticated API request with proactive + reactive refresh ──

    protected async apiRequest(
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
            if (this.refreshTokenValue) {
                const newToken = await this.refreshAccessToken()
                if (newToken) {
                    return this.apiRequest(url, options, true)
                }
            }

            // No refresh token or refresh failed
            this.emitter?.emit(`${this.spec.eventPrefix}:session-expired`, {})
            this.clearTokens()
            this.setState('session-expired')
        }

        throw new UpupNetworkError(
            `${this.spec.displayName} API error (${res.status}): ${errorText}`,
            res.status,
        )
    }

    // ── Private: token management ──

    protected setTokens(
        access: string,
        refresh: string | null,
        expiresIn?: number,
    ): void {
        this.accessToken = access
        this.refreshTokenValue = refresh
        this.tokenExpiry = expiresIn ? Date.now() + expiresIn * 1000 : 0

        storageSet(this.spec.storageKeys.access, access)
        if (refresh) storageSet(this.spec.storageKeys.refresh, refresh)
        if (this.tokenExpiry) {
            storageSet(this.spec.storageKeys.expiry, String(this.tokenExpiry))
        }
    }

    protected clearTokens(): void {
        this.accessToken = null
        this.refreshTokenValue = null
        this.tokenExpiry = 0
        storageDel(this.spec.storageKeys.access)
        storageDel(this.spec.storageKeys.refresh)
        storageDel(this.spec.storageKeys.expiry)
    }

    protected async ensureValidToken(): Promise<void> {
        if (!this.accessToken) {
            throw new UpupAuthError(
                'Not authenticated — no access token',
                this.spec.displayName,
            )
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

    protected getRedirectUri(): string {
        if (this.config.redirectUri) {
            return this.config.redirectUri
        }
        if (typeof window !== 'undefined') {
            return `${window.location.origin}${this.spec.redirectPath}`
        }
        return ''
    }

    // ── Private: popup cleanup ──

    protected cleanupPopup(): void {
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

    // ── Provider-specific (subclass supplies the REAL API logic, moved verbatim) ──

    protected abstract mapEntry(entry: Record<string, unknown>): DriveFile
    protected abstract fetchUserProfile(): Promise<DriveUser>
    abstract loadFiles(folderArg?: string): Promise<unknown>
    abstract downloadFiles(files: DriveFile[]): Promise<File[]>
}
