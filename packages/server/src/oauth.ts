// packages/server/src/oauth.ts
//
// The cloud-drive OAuth flow in isolation (F-101/F-505): provider identity +
// metadata, the redirect/callback handlers, the success-page builder, returnTo
// validation, and the access-token refresh. Extracted verbatim from handler.ts.
// The provider identity (VALID_PROVIDERS/OAuthProvider/isValidProvider) lives
// here — auth is where "provider" originates — and is imported by the two drive
// modules. This module imports NOTHING from the drive modules (acyclic DAG).

import { UpupErrorCode } from '@upup/core'
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
    'onedrive',
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
        case 'onedrive': {
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
    const base = `${url.origin}${url.pathname.replace(/\/auth\/[\w-]+(?:\/cb)?$/, '')}`
    return `${base}/auth/${provider}/cb`
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
    const returnTo = new URL(req.url).searchParams.get('returnTo') ?? undefined
    await saveOAuthState(config.tokenStore, state, {
        userId,
        provider,
        returnTo,
    })

    const params = new URLSearchParams({
        client_id: meta.clientId,
        redirect_uri: callbackUrlFor(req, provider),
        response_type: 'code',
        scope: meta.scope,
        state,
        ...(meta.extra ?? {}),
    })

    return res.redirect(`${meta.authUrl}?${params.toString()}`)
}

export async function handleOAuthCallback(
    req: Request,
    config: UpupServerConfig,
    provider: string,
    res: Responder,
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

    const meta = getProviderMeta(config, provider)
    if ('error' in meta) return res.json({ error: meta.error }, meta.status)

    const tokenRes = await fetch(meta.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: meta.clientId,
            client_secret: meta.clientSecret,
            redirect_uri: callbackUrlFor(req, provider),
            grant_type: 'authorization_code',
        }),
    })

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
        access_token: string
        expires_in?: number
        refresh_token?: string
        scope?: string
        token_type?: string
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
    const res = await fetch(meta.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: tokens.refreshToken,
            client_id: meta.clientId,
            client_secret: meta.clientSecret,
        }),
    })
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
        access_token: string
        expires_in?: number
        refresh_token?: string
        scope?: string
        token_type?: string
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
