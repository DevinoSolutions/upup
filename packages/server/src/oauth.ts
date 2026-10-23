// packages/server/src/oauth.ts
//
// The cloud-drive OAuth flow in isolation (F-101/F-505): provider identity +
// metadata, the redirect/callback handlers, the success-page builder, returnTo
// validation, and the access-token refresh. Extracted verbatim from handler.ts.
// The provider identity (VALID_PROVIDERS/OAuthProvider/isValidProvider) lives
// here — auth is where "provider" originates — and is imported by the two drive
// modules. This module imports NOTHING from the drive modules (acyclic DAG).

import { UpupErrorCode } from '@useupup/core'
import type { UpupServerConfig, DriveTokens } from './config'
import {
    generateOAuthState,
    saveOAuthState,
    consumeOAuthState,
    setTokens,
    deleteTokens,
    resolveUserId,
} from './tokenStore'
import { reportServerError, toSafeError } from './observability'
import { type Responder } from './respond'

export const VALID_PROVIDERS = [
    'google-drive',
    'one-drive',
    'dropbox',
    'box',
] as const
export type OAuthProvider = (typeof VALID_PROVIDERS)[number]

export function isValidProvider(p: string): p is OAuthProvider {
    return (VALID_PROVIDERS as readonly string[]).includes(p)
}

type ProviderOAuthMeta = {
    authUrl: string
    tokenUrl: string
    scope: string
    clientId: string
    clientSecret: string
    extra?: Record<string, string>
}

function getProviderMeta(
    config: UpupServerConfig,
    provider: OAuthProvider,
): ProviderOAuthMeta | { error: string; status: number } {
    const providers = config.providers
    if (!providers)
        return { error: 'No OAuth providers configured', status: 500 }

    switch (provider) {
        case 'google-drive': {
            const gc = providers.googleDrive
            if (!gc)
                return { error: 'Google Drive not configured', status: 400 }
            return {
                authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenUrl: 'https://oauth2.googleapis.com/token',
                scope: 'https://www.googleapis.com/auth/drive.readonly',
                clientId: gc.clientId,
                clientSecret: gc.clientSecret,
                extra: { access_type: 'offline', prompt: 'consent' },
            }
        }
        case 'one-drive': {
            const oc = providers.oneDrive
            if (!oc) return { error: 'OneDrive not configured', status: 400 }
            const tenant = oc.tenantId ?? 'common'
            return {
                authUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
                tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
                scope: 'Files.Read.All offline_access',
                clientId: oc.clientId,
                clientSecret: oc.clientSecret,
            }
        }
        case 'dropbox': {
            const dc = providers.dropbox
            if (!dc) return { error: 'Dropbox not configured', status: 400 }
            return {
                authUrl: 'https://www.dropbox.com/oauth2/authorize',
                tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
                scope: 'files.content.read files.metadata.read',
                clientId: dc.appKey,
                clientSecret: dc.appSecret,
                extra: { token_access_type: 'online' },
            }
        }
        case 'box': {
            const bc = providers.box
            if (!bc) return { error: 'Box not configured', status: 400 }
            return {
                authUrl: 'https://account.box.com/api/oauth2/authorize',
                tokenUrl: 'https://api.box.com/oauth2/token',
                scope: 'root_readonly',
                clientId: bc.clientId,
                clientSecret: bc.clientSecret,
            }
        }
    }
}

function callbackUrlFor(req: Request, provider: string): string {
    const url = new URL(req.url)
    // Strip the route suffix so this is idempotent across BOTH the auth request
    // (/auth/:provider) and the callback (/auth/:provider/cb) — otherwise the
    // token-exchange redirect_uri doubles the path and Google rejects it with
    // redirect_uri_mismatch. Mirrors the router's own /auth match (line ~128).
    // The optional trailing slash mirrors the router's slash-stripped matching
    // (Next trailingSlash:true 308s /auth/x to /auth/x/) — without it the
    // stray slash survives into base and the derived redirect_uri.
    const base = `${url.origin}${url.pathname.replace(/\/auth\/[\w-]+(?:\/cb)?\/?$/, '')}`
    return `${base}/auth/${provider}/cb`
}

// ─────────────────────────────────────────────────────────────
// Browser binding (T-5463). The popup's top-level navigation to /auth/:provider
// cannot carry an Authorization header, and anonymous mode resolves every caller
// to the same user, so comparing identities at /cb protects nothing. A nonce
// cookie set on the server's own origin works for header auth, session-cookie
// auth and anonymous mode alike: only the browser that was redirected holds it.
// ─────────────────────────────────────────────────────────────

const NONCE_COOKIE_MAX_AGE_SECONDS = 600

/** Outbound calls to the provider's token endpoint must not hang the callback
 *  (and its popup) on a stalled provider. */
const TOKEN_ENDPOINT_TIMEOUT_MS = 15_000

/** Over https the cookie is `__Host-` prefixed (browsers then require Secure,
 *  Path=/ and NO Domain), so a sibling subdomain cannot toss a cookie of the
 *  same name at the callback. Plain http (local dev / e2e) cannot carry a
 *  `__Host-` cookie, so it keeps the bare name and the /cb path. */
function nonceCookieName(provider: string, secure: boolean): string {
    return `${secure ? '__Host-' : ''}upup_oauth_${provider}`
}

/** Whether the callback URL (already proxy-normalized) is https. */
function isSecureCallback(req: Request, provider: string): boolean {
    return new URL(callbackUrlFor(req, provider)).protocol === 'https:'
}

async function sha256Hex(input: string): Promise<string> {
    const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(input),
    )
    return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

/** Constant-time compare — never branch on content before lengths match. */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return diff === 0
}

/** EVERY value sent under `name`, in header order. A browser can send several
 *  cookies of one name (a sibling-subdomain cookie, or a different Path), and
 *  which one comes first is not the server's to rely on — so the caller checks
 *  each candidate rather than letting the first shadow the real one. */
function readCookies(req: Request, name: string): string[] {
    const header = req.headers.get('cookie')
    if (!header) return []
    const values: string[] = []
    for (const part of header.split(';')) {
        const eq = part.indexOf('=')
        if (eq === -1) continue
        if (part.slice(0, eq).trim() === name) {
            values.push(part.slice(eq + 1).trim())
        }
    }
    return values
}

/** `Set-Cookie` for the nonce. Over https: `__Host-` name, Path=/, Secure, no
 *  Domain (all three required by the prefix). Over plain http: the bare name
 *  scoped to the /cb path of the callback URL, so it is sent to the callback and
 *  nowhere else under any prefix mount. The scheme comes from the callback URL
 *  (already proxy-normalized). Always HttpOnly + SameSite=Lax. */
function nonceSetCookie(
    req: Request,
    provider: string,
    value: string,
    maxAge: number,
): string {
    const cb = new URL(callbackUrlFor(req, provider))
    const secure = cb.protocol === 'https:'
    return [
        `${nonceCookieName(provider, secure)}=${value}`,
        `Path=${secure ? '/' : cb.pathname}`,
        `Max-Age=${maxAge}`,
        'HttpOnly',
        'SameSite=Lax',
        ...(secure ? ['Secure'] : []),
    ].join('; ')
}

export async function handleOAuthRedirect(
    req: Request,
    config: UpupServerConfig,
    provider: string,
    res: Responder,
): Promise<Response> {
    if (!isValidProvider(provider)) {
        return res.json({ error: `Unknown provider: ${provider}` }, 400)
    }

    if (!config.tokenStore) {
        return res.json(
            { error: 'tokenStore is required for OAuth flows' },
            500,
        )
    }

    const userId = await resolveUserId(config, req)
    if (!userId) return res.json({ error: 'Unauthenticated' }, 401)

    const meta = getProviderMeta(config, provider)
    if ('error' in meta) return res.json({ error: meta.error }, meta.status)

    const state = generateOAuthState()
    const nonce = generateOAuthState()
    const returnTo = new URL(req.url).searchParams.get('returnTo') ?? undefined
    await saveOAuthState(config.tokenStore, state, {
        userId,
        provider,
        returnTo,
        nonceHash: await sha256Hex(nonce),
    })

    const params = new URLSearchParams({
        client_id: meta.clientId,
        redirect_uri: callbackUrlFor(req, provider),
        response_type: 'code',
        scope: meta.scope,
        state,
        ...(meta.extra ?? {}),
    })

    return res.redirect(`${meta.authUrl}?${params.toString()}`, 302, {
        'Set-Cookie': nonceSetCookie(
            req,
            provider,
            nonce,
            NONCE_COOKIE_MAX_AGE_SECONDS,
        ),
    })
}

/** The callback, plus: every exit AFTER the request's state resolved to a real
 *  pending flow for this provider clears the nonce cookie (success already
 *  does), so a failed or rejected attempt does not leave a live nonce in the
 *  browser for the rest of its 10 minutes. A /cb with a missing, unknown or
 *  other-provider state proves nothing about THIS browser's flow and leaves the
 *  cookie alone: clearing there would let a cross-site navigation to
 *  /auth/<p>/cb wipe a victim's in-flight login. */
export async function handleOAuthCallback(
    req: Request,
    config: UpupServerConfig,
    provider: string,
    res: Responder,
): Promise<Response> {
    let stateResolved = false
    const response = await runOAuthCallback(req, config, provider, res, () => {
        stateResolved = true
    })
    // The success page already carries its own clearing cookie.
    if (
        stateResolved &&
        isValidProvider(provider) &&
        !response.headers.has('Set-Cookie')
    ) {
        response.headers.append(
            'Set-Cookie',
            nonceSetCookie(req, provider, '', 0),
        )
    }
    return response
}

async function runOAuthCallback(
    req: Request,
    config: UpupServerConfig,
    provider: string,
    res: Responder,
    onStateResolved: () => void,
): Promise<Response> {
    if (!isValidProvider(provider)) {
        return res.json({ error: `Unknown provider: ${provider}` }, 400)
    }
    if (!config.tokenStore) {
        return res.json({ error: 'tokenStore is required' }, 500)
    }

    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) return res.json({ error: `OAuth error: ${error}` }, 400)
    if (!code || !state)
        return res.json({ error: 'Missing code or state' }, 400)

    const stateData = await consumeOAuthState(config.tokenStore, state)
    if (!stateData || stateData.provider !== provider) {
        return res.json({ error: 'Invalid or expired state' }, 400)
    }
    onStateResolved()

    // Bind the callback to the browser that started the flow. The state is
    // already consumed, so a forged attempt only burns the attacker's own state.
    // A state without a nonceHash (pre-binding, or tampered) fails closed.
    // Every same-named cookie is a candidate; any one matching the state's hash
    // binds the callback. Each comparison is constant-time.
    const expectedHash = stateData.nonceHash
    let bound = false
    if (expectedHash !== undefined) {
        const cookieName = nonceCookieName(
            provider,
            isSecureCallback(req, provider),
        )
        for (const candidate of readCookies(req, cookieName)) {
            if (timingSafeEqual(await sha256Hex(candidate), expectedHash)) {
                bound = true
            }
        }
    }
    if (!bound) {
        return res.fail(
            `auth/${provider}/cb`,
            req.method,
            403,
            UpupErrorCode.AUTH_DENIED,
            'OAuth session mismatch',
            new Error('OAuth callback cookie missing or does not match state'),
        )
    }

    const meta = getProviderMeta(config, provider)
    if ('error' in meta) return res.json({ error: meta.error }, meta.status)

    let tokenRes: Response
    try {
        tokenRes = await fetch(meta.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: meta.clientId,
                client_secret: meta.clientSecret,
                redirect_uri: callbackUrlFor(req, provider),
                grant_type: 'authorization_code',
            }),
            signal: AbortSignal.timeout(TOKEN_ENDPOINT_TIMEOUT_MS),
        })
    } catch (error) {
        // upup-catch: a stalled or unreachable provider is reported through
        // onError and surfaced as the same 502 a rejected exchange gets, so the
        // popup never hangs and the cause is never lost.
        reportServerError(config.onError, {
            route: `auth/${provider}/cb`,
            method: req.method,
            status: 502,
            code: UpupErrorCode.AUTH_PROVIDER_ERROR,
            message: 'Token exchange request failed',
            error: toSafeError(error),
        })
        return res.json(
            {
                error: 'Token exchange failed',
                code: UpupErrorCode.AUTH_PROVIDER_ERROR,
            },
            502,
        )
    }

    if (!tokenRes.ok) {
        const body = await tokenRes.text()
        reportServerError(config.onError, {
            route: `auth/${provider}/cb`,
            method: req.method,
            status: 502,
            code: UpupErrorCode.AUTH_PROVIDER_ERROR,
            message: 'Token exchange failed',
            error: toSafeError(new Error(body.slice(0, 500))),
        })
        return res.json(
            {
                error: 'Token exchange failed',
                code: UpupErrorCode.AUTH_PROVIDER_ERROR,
            },
            502,
        )
    }

    const payload = (await tokenRes.json()) as {
        access_token?: unknown
        expires_in?: number
        refresh_token?: string
        scope?: string
        token_type?: string
    }

    // A 200 without a usable access_token must not be stored as a credential.
    if (typeof payload.access_token !== 'string' || !payload.access_token) {
        reportServerError(config.onError, {
            route: `auth/${provider}/cb`,
            method: req.method,
            status: 502,
            code: UpupErrorCode.AUTH_PROVIDER_ERROR,
            message: 'Token exchange response had no access_token',
            error: toSafeError(new Error('missing access_token')),
        })
        return res.json(
            {
                error: 'Token exchange failed',
                code: UpupErrorCode.AUTH_PROVIDER_ERROR,
            },
            502,
        )
    }

    const tokens: DriveTokens = {
        accessToken: payload.access_token,
        expiresAt: payload.expires_in
            ? Date.now() + payload.expires_in * 1000
            : undefined,
        scope: payload.scope,
        tokenType: payload.token_type,
        refreshToken: payload.refresh_token,
    }
    await setTokens(config.tokenStore, stateData.userId, provider, tokens)

    const validatedReturn = validateReturnTo(
        stateData.returnTo,
        req,
        config.cors,
    )
    const targetOrigins = concreteAllowedOrigins(config.cors)
    return res.html(
        buildOAuthSuccessPage(provider, {
            targetOrigins,
            ...(validatedReturn !== undefined
                ? { returnTo: validatedReturn }
                : {}),
        }),
        200,
        { 'Set-Cookie': nonceSetCookie(req, provider, '', 0) },
    )
}

/** Validate an OAuth returnTo against same-origin + the CORS allowlist (audit S7).
 *  Returns the resolved absolute URL string if allowed, else undefined.
 *  A wildcard '*' in allowedOrigins does NOT authorize an arbitrary cross-origin returnTo.
 *  Proxy caveat: a RELATIVE returnTo resolves against `new URL(req.url).origin` and is
 *  returned ABSOLUTE. Behind an origin-rewriting reverse proxy (internal req.url origin ≠
 *  public origin) it becomes absolute to the INTERNAL origin — this fails closed (never an
 *  open redirect); to keep relative returnTo working there, add the public origin to
 *  cors.allowedOrigins. */
export function validateReturnTo(
    returnTo: string | undefined,
    req: Request,
    cors: { allowedOrigins: string[] } | undefined,
): string | undefined {
    if (!returnTo) return undefined
    const serverOrigin = new URL(req.url).origin
    let resolved: URL
    try {
        resolved = new URL(returnTo, serverOrigin) // relative returnTo resolves to same-origin
    } catch {
        // upup-catch: a malformed returnTo is rejected (fail-closed) so it can
        // never become an open redirect — absence of a valid URL means "deny".
        return undefined
    }
    if (resolved.origin === serverOrigin) return resolved.toString()
    const concrete = (cors?.allowedOrigins ?? []).filter(o => o !== '*')
    if (concrete.includes(resolved.origin)) return resolved.toString()
    return undefined
}

/** Concrete (non-wildcard) origins to target postMessage at (audit S7). */
export function concreteAllowedOrigins(
    cors: { allowedOrigins: string[] } | undefined,
): string[] {
    return (cors?.allowedOrigins ?? []).filter(o => o !== '*')
}

export function buildOAuthSuccessPage(
    provider: string,
    opts: { returnTo?: string; targetOrigins: string[] },
): string {
    const safeProvider = provider.replace(/[^a-z0-9-]/gi, '')
    const { returnTo, targetOrigins } = opts

    let postMessageScript: string
    if (targetOrigins.length > 0) {
        postMessageScript = targetOrigins
            .map(
                origin =>
                    `window.opener.postMessage({ type: 'upup:oauth-success', provider: ${JSON.stringify(safeProvider)} }, ${JSON.stringify(origin)});`,
            )
            .join('\n      ')
    } else {
        // '*' is acceptable here because the payload is token-free ({type, provider}, no secret)
        postMessageScript = `window.opener.postMessage({ type: 'upup:oauth-success', provider: ${JSON.stringify(safeProvider)} }, '*' /* token-free payload */);`
    }

    const elseBody = returnTo
        ? `window.location.replace(${JSON.stringify(returnTo)});`
        : `document.body.textContent = 'Connected to ' + ${JSON.stringify(safeProvider)} + '. You may close this window.';`

    return `<!doctype html>
<html><head><title>Connected</title></head><body>
<script>
  try {
    if (window.opener) {
      ${postMessageScript}
      window.close();
    } else if (${JSON.stringify(returnTo ?? '')}) {
      ${elseBody}
    } else {
      document.body.textContent = 'Connected to ' + ${JSON.stringify(safeProvider)} + '. You may close this window.';
    }
  } catch (e) {
    document.body.textContent = 'Connected. You may close this window.';
  }
</script>
</body></html>`
}

export async function refreshAccessToken(
    config: UpupServerConfig,
    provider: OAuthProvider,
    userId: string,
    tokens: DriveTokens,
): Promise<DriveTokens | null> {
    if (!tokens.refreshToken || !config.tokenStore) return null
    const meta = getProviderMeta(config, provider)
    if ('error' in meta) return null
    let res: Response
    try {
        res = await fetch(meta.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: tokens.refreshToken,
                client_id: meta.clientId,
                client_secret: meta.clientSecret,
            }),
            signal: AbortSignal.timeout(TOKEN_ENDPOINT_TIMEOUT_MS),
        })
    } catch (error) {
        // upup-catch: a stalled or unreachable provider is reported through
        // onError and answered like any failed refresh (null -> the drive
        // routes' 401 reauth) instead of escaping as the router's generic 500.
        // The stored grant is KEPT: a transient stall is not a revoked token,
        // so the next request can simply try again.
        reportServerError(config.onError, {
            route: `auth/${provider}/refresh`,
            method: 'POST',
            status: 502,
            code: UpupErrorCode.AUTH_PROVIDER_ERROR,
            message: 'Drive token refresh request failed',
            error: toSafeError(error),
        })
        return null
    }
    if (!res.ok) {
        // Refresh token is dead/revoked -> force a clean re-auth.
        const body = await res.text().catch(() => '')
        reportServerError(config.onError, {
            route: `auth/${provider}/refresh`,
            method: 'POST',
            status: res.status,
            code: UpupErrorCode.AUTH_EXPIRED,
            message: 'Drive token refresh failed',
            error: toSafeError(new Error(body.slice(0, 500) || res.statusText)),
        })
        await deleteTokens(config.tokenStore, userId, provider)
        return null
    }
    const payload = (await res.json()) as {
        access_token?: unknown
        expires_in?: number
        refresh_token?: string
        scope?: string
        token_type?: string
    }
    if (typeof payload.access_token !== 'string' || !payload.access_token) {
        // A 200 with no usable access_token is as dead as a rejected refresh:
        // never store undefined as the credential, force a clean re-auth.
        reportServerError(config.onError, {
            route: `auth/${provider}/refresh`,
            method: 'POST',
            status: res.status,
            code: UpupErrorCode.AUTH_EXPIRED,
            message: 'Drive token refresh response had no access_token',
            error: toSafeError(new Error('missing access_token')),
        })
        await deleteTokens(config.tokenStore, userId, provider)
        return null
    }
    const next: DriveTokens = {
        accessToken: payload.access_token,
        expiresAt: payload.expires_in
            ? Date.now() + payload.expires_in * 1000
            : undefined,
        scope: payload.scope ?? tokens.scope,
        tokenType: payload.token_type ?? tokens.tokenType,
        // Some providers omit refresh_token on refresh -> keep the existing one.
        refreshToken: payload.refresh_token ?? tokens.refreshToken,
    }
    await setTokens(config.tokenStore, userId, provider, next)
    return next
}
