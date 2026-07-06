import type {
    TokenStore,
    DriveTokens,
    OAuthState,
    UpupServerConfig,
} from './config'

/**
 * Zero-dependency reference implementation. Fine for demos, single-process
 * dev, and serverless runtimes where the function is warm. NOT suitable
 * for production: tokens are lost on restart, state isn't shared across
 * workers. Ship a Redis / KV / DB-backed store for real deployments.
 */
export class InMemoryTokenStore implements TokenStore {
    private store = new Map<
        string,
        { value: string; expiresAt: number | null }
    >()

    get(key: string): Promise<string | null> {
        const entry = this.store.get(key)
        if (!entry) return Promise.resolve(null)
        if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
            this.store.delete(key)
            return Promise.resolve(null)
        }
        return Promise.resolve(entry.value)
    }

    set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        // ttlSeconds === 0 means "already expired", NOT "no expiry". Only an
        // omitted ttl (undefined) stores without expiry.
        const expiresAt =
            ttlSeconds != null ? Date.now() + ttlSeconds * 1000 : null
        this.store.set(key, { value, expiresAt })
        return Promise.resolve()
    }

    delete(key: string): Promise<void> {
        this.store.delete(key)
        return Promise.resolve()
    }
}

const OAUTH_STATE_TTL_SECONDS = 600

const tokensKey = (userId: string, provider: string) =>
    `upup:tokens:${userId}:${provider}`
const oauthStateKey = (state: string) => `upup:oauth-state:${state}`

export async function getTokens(
    store: TokenStore,
    userId: string,
    provider: string,
): Promise<DriveTokens | null> {
    const raw = await store.get(tokensKey(userId, provider))
    if (!raw) return null
    try {
        return JSON.parse(raw) as DriveTokens
    } catch {
        // upup-catch: a corrupt/legacy token blob is treated as absent — the
        // caller re-authenticates rather than crashing on bad stored JSON.
        return null
    }
}

export async function setTokens(
    store: TokenStore,
    userId: string,
    provider: string,
    tokens: DriveTokens,
): Promise<void> {
    // Refresh-aware TTL (audit S8): when a refresh token exists the blob must
    // outlive the short-lived access token so it can be refreshed, so store it
    // without expiry. Only a dead, non-refreshable access token self-evicts.
    let ttlSeconds: number | undefined
    if (!tokens.refreshToken && tokens.expiresAt) {
        ttlSeconds = Math.max(
            0,
            Math.ceil((tokens.expiresAt - Date.now()) / 1000),
        )
    }
    await store.set(
        tokensKey(userId, provider),
        JSON.stringify(tokens),
        ttlSeconds,
    )
}

export async function deleteTokens(
    store: TokenStore,
    userId: string,
    provider: string,
): Promise<void> {
    await store.delete(tokensKey(userId, provider))
}

export async function saveOAuthState(
    store: TokenStore,
    state: string,
    payload: OAuthState,
): Promise<void> {
    await store.set(
        oauthStateKey(state),
        JSON.stringify(payload),
        OAUTH_STATE_TTL_SECONDS,
    )
}

export async function consumeOAuthState(
    store: TokenStore,
    state: string,
): Promise<OAuthState | null> {
    const raw = await store.get(oauthStateKey(state))
    if (!raw) return null
    await store.delete(oauthStateKey(state))
    try {
        return JSON.parse(raw) as OAuthState
    } catch {
        // upup-catch: a corrupt oauth-state blob is treated as absent — the OAuth
        // flow restarts rather than crashing on bad stored JSON.
        return null
    }
}

export function generateOAuthState(): string {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

export const DEFAULT_USER_ID = 'default'

/**
 * Resolve the authenticated userId for this request, honouring the
 * consumer's getUserId hook. Returns null if the hook says unauthenticated.
 */
export async function resolveUserId(
    config: UpupServerConfig,
    req: Request,
): Promise<string | null> {
    if (config.getUserId) return config.getUserId(req)
    return DEFAULT_USER_ID
}
