// scripts/drive-sandbox/providers.mjs
//
// Shared foundation for the cloud-drive SANDBOX test harness (mint / seed /
// live integration suite all import from here). It is the single place that
// knows: which env vars carry each provider's sandbox secrets, and how to turn
// those secrets into a fresh access token.
//
// This is a TEST-ONLY harness. It never touches production credentials and is
// never imported by shipped package code — it lives under scripts/ and runs
// only behind the UPUP_DRIVE_SANDBOX master switch (see the integration suite)
// or from the one-time mint/seed CLIs.
//
// Token-minting model per provider:
//   - box:         Client Credentials Grant (service account, no user, no
//                  refresh token) — zero-maintenance.
//   - dropbox:     refresh_token grant (Dropbox refresh tokens never expire).
//   - google-drive:refresh_token grant (stable refresh token; the nightly run
//                  is its 6-month-inactivity heartbeat).
//   - one-drive:   refresh_token grant (MS rotates the refresh token on every
//                  use — the nightly job writes the rotated value back via
//                  refresh-one-drive-token.mjs; here we just mint).
//
// CI shortcut: if UPUP_TEST_<P>_ACCESS_TOKEN is set, mintAccessToken returns it
// verbatim and performs NO grant. The OneDrive nightly path uses this so the
// single rotation happens once (in the write-back step), not again per test.

/** The four sandbox providers, wire-form slugs (match @upup/server VALID_PROVIDERS). */
export const PROVIDERS = ['box', 'dropbox', 'google-drive', 'one-drive']

/** Fixed localhost callback the mint CLI listens on. Register this EXACT URI as
 *  a redirect URI in each provider's dev app (Box needs none — it uses CCG). */
export const CALLBACK_PORT = 53682
export const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`

// ── Per-provider secret env-var names ────────────────────────────────────────
// Grouped so the CLIs, the suite, and the docs all read one source of truth.
const ENV = {
    box: {
        clientId: 'UPUP_TEST_BOX_CLIENT_ID',
        clientSecret: 'UPUP_TEST_BOX_CLIENT_SECRET',
        enterpriseId: 'UPUP_TEST_BOX_ENTERPRISE_ID',
        accessToken: 'UPUP_TEST_BOX_ACCESS_TOKEN',
    },
    dropbox: {
        clientId: 'UPUP_TEST_DROPBOX_APP_KEY',
        clientSecret: 'UPUP_TEST_DROPBOX_APP_SECRET',
        refreshToken: 'UPUP_TEST_DROPBOX_REFRESH_TOKEN',
        accessToken: 'UPUP_TEST_DROPBOX_ACCESS_TOKEN',
    },
    'google-drive': {
        clientId: 'UPUP_TEST_GDRIVE_CLIENT_ID',
        clientSecret: 'UPUP_TEST_GDRIVE_CLIENT_SECRET',
        refreshToken: 'UPUP_TEST_GDRIVE_REFRESH_TOKEN',
        accessToken: 'UPUP_TEST_GDRIVE_ACCESS_TOKEN',
    },
    'one-drive': {
        clientId: 'UPUP_TEST_ONEDRIVE_CLIENT_ID',
        clientSecret: 'UPUP_TEST_ONEDRIVE_CLIENT_SECRET',
        refreshToken: 'UPUP_TEST_ONEDRIVE_REFRESH_TOKEN',
        accessToken: 'UPUP_TEST_ONEDRIVE_ACCESS_TOKEN',
        tenant: 'UPUP_TEST_ONEDRIVE_TENANT',
    },
}

/** Names of the env vars a provider needs to mint (minus the access-token
 *  shortcut, which is optional). Used for "configured?" checks + clear errors. */
const REQUIRED = {
    box: ['clientId', 'clientSecret', 'enterpriseId'],
    dropbox: ['clientId', 'clientSecret', 'refreshToken'],
    'google-drive': ['clientId', 'clientSecret', 'refreshToken'],
    'one-drive': ['clientId', 'clientSecret', 'refreshToken'],
}

// OAuth endpoints — mirrored from packages/server/src/oauth.ts so the harness
// exercises the same hosts the shipped server talks to.
const TOKEN_URL = {
    box: 'https://api.box.com/oauth2/token',
    dropbox: 'https://api.dropboxapi.com/oauth2/token',
    'google-drive': 'https://oauth2.googleapis.com/token',
    // one-drive is tenant-scoped — see oneDriveTenant() / oneDriveTokenUrl().
}

const AUTH_URL = {
    dropbox: 'https://www.dropbox.com/oauth2/authorize',
    'google-drive': 'https://accounts.google.com/o/oauth2/v2/auth',
    // one-drive is tenant-scoped — see oneDriveAuthUrl().
}

// SANDBOX consent scopes are WRITE-INCLUSIVE (production is read-only): the
// one-time human consent must grant enough to let seed.mjs create the fixture
// tree. The production drive-clients read paths work fine with a write token.
//   - google drive.file: app sees/manages only files IT created — exactly our
//     seeded fixtures — and needs NO Google verification (non-sensitive scope).
const CONSENT_SCOPE = {
    dropbox:
        'files.content.write files.content.read files.metadata.read account_info.read',
    'google-drive': 'https://www.googleapis.com/auth/drive.file',
    'one-drive': 'Files.ReadWrite offline_access',
}

function env(provider, key) {
    const name = ENV[provider]?.[key]
    return name ? process.env[name] : undefined
}

function oneDriveTenant() {
    return env('one-drive', 'tenant') || 'consumers'
}

function oneDriveTokenUrl() {
    return `https://login.microsoftonline.com/${oneDriveTenant()}/oauth2/v2.0/token`
}

function oneDriveAuthUrl() {
    return `https://login.microsoftonline.com/${oneDriveTenant()}/oauth2/v2.0/authorize`
}

function tokenUrlFor(provider) {
    return provider === 'one-drive' ? oneDriveTokenUrl() : TOKEN_URL[provider]
}

/** Env-var names a provider requires (for docs / error messages). */
export function requiredEnvNames(provider) {
    return REQUIRED[provider].map(k => ENV[provider][k])
}

/** True when this provider's sandbox secrets are present (or a pre-minted
 *  access token is supplied). Absence → the suite skips green; presence with a
 *  broken token → a real RED failure. */
export function isProviderConfigured(provider) {
    if (env(provider, 'accessToken')) return true
    return REQUIRED[provider].every(k => Boolean(env(provider, k)))
}

/** Throw a precise, actionable error if a provider is asked to mint unconfigured. */
export function assertConfigured(provider) {
    if (isProviderConfigured(provider)) return
    const missing = REQUIRED[provider]
        .filter(k => !env(provider, k))
        .map(k => ENV[provider][k])
    throw new Error(
        `[drive-sandbox] ${provider} is not configured — missing: ${missing.join(
            ', ',
        )}. See docs/drive-sandbox-setup.md.`,
    )
}

async function postForm(url, params) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
    })
    if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(
            `[drive-sandbox] token endpoint ${url} → ${res.status}: ${
                body.slice(0, 300) || res.statusText
            }`,
        )
    }
    return res.json()
}

/** Box Client Credentials Grant → a service-account access token (no refresh). */
export async function boxCcgGrant() {
    assertConfigured('box')
    const payload = await postForm(TOKEN_URL.box, {
        grant_type: 'client_credentials',
        client_id: env('box', 'clientId'),
        client_secret: env('box', 'clientSecret'),
        box_subject_type: 'enterprise',
        box_subject_id: env('box', 'enterpriseId'),
    })
    return {
        accessToken: payload.access_token,
        expiresIn: payload.expires_in,
    }
}

/** refresh_token grant for dropbox / google-drive / one-drive. Returns the new
 *  access token AND the (possibly rotated) refresh token — callers that persist
 *  rotation (OneDrive write-back) need the latter. */
export async function refreshGrant(provider) {
    if (provider === 'box') {
        throw new Error(
            '[drive-sandbox] box uses boxCcgGrant, not refreshGrant',
        )
    }
    assertConfigured(provider)
    const payload = await postForm(tokenUrlFor(provider), {
        grant_type: 'refresh_token',
        refresh_token: env(provider, 'refreshToken'),
        client_id: env(provider, 'clientId'),
        client_secret: env(provider, 'clientSecret'),
    })
    return {
        accessToken: payload.access_token,
        // Providers may omit refresh_token on refresh → keep the one we sent.
        refreshToken: payload.refresh_token ?? env(provider, 'refreshToken'),
        expiresIn: payload.expires_in,
    }
}

/** The universal entry point: a fresh access token for any provider.
 *  Honors the UPUP_TEST_<P>_ACCESS_TOKEN CI shortcut (no grant performed). */
export async function mintAccessToken(provider) {
    const pre = env(provider, 'accessToken')
    if (pre) return pre
    if (provider === 'box') return (await boxCcgGrant()).accessToken
    return (await refreshGrant(provider)).accessToken
}

// ── One-time consent helpers (used by mint.mjs; box has no consent step) ─────

/** Build the provider consent URL for the one-time mint flow. */
export function buildConsentUrl(provider, state) {
    if (provider === 'box') {
        throw new Error(
            '[drive-sandbox] box needs no consent — it uses Client Credentials',
        )
    }
    const clientId = env(provider, 'clientId')
    if (!clientId) {
        throw new Error(
            `[drive-sandbox] ${provider}: set ${ENV[provider].clientId} before minting`,
        )
    }
    const base =
        provider === 'one-drive' ? oneDriveAuthUrl() : AUTH_URL[provider]
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: CONSENT_SCOPE[provider],
        state,
    })
    // Provider-specific params that force a durable refresh token.
    if (provider === 'google-drive') {
        params.set('access_type', 'offline')
        params.set('prompt', 'consent')
    } else if (provider === 'dropbox') {
        params.set('token_access_type', 'offline')
    } else if (provider === 'one-drive') {
        params.set('response_mode', 'query')
    }
    return `${base}?${params.toString()}`
}

/** Exchange the authorization code (caught on the localhost redirect) for
 *  tokens. Returns { accessToken, refreshToken } — the refresh token is what
 *  you store as the UPUP_TEST_<P>_REFRESH_TOKEN secret. */
export async function exchangeCodeForTokens(provider, code) {
    if (provider === 'box') {
        throw new Error('[drive-sandbox] box has no code exchange (CCG)')
    }
    const payload = await postForm(tokenUrlFor(provider), {
        grant_type: 'authorization_code',
        code,
        client_id: env(provider, 'clientId'),
        client_secret: env(provider, 'clientSecret'),
        redirect_uri: REDIRECT_URI,
    })
    return {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        scope: payload.scope,
        expiresIn: payload.expires_in,
    }
}

/** The secret name that holds a provider's refresh token (for mint.mjs output). */
export function refreshTokenEnvName(provider) {
    return ENV[provider].refreshToken
}
