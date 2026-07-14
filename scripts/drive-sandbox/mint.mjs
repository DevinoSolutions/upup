// scripts/drive-sandbox/mint.mjs
//
// ONE-TIME setup CLI: mint a durable refresh token for a cloud-drive SANDBOX
// provider so the nightly integration suite can authenticate without a human.
//
//   node scripts/drive-sandbox/mint.mjs <provider>
//   # in repo: pnpm run drive:sandbox:mint <provider>  (loads .env.test)
//
// This performs a HUMAN-IN-THE-LOOP OAuth consent: it prints (and best-effort
// opens) the provider's consent URL, the human clicks "Allow" in their OWN
// browser, and the provider redirects back to a localhost listener that catches
// the authorization code. This CLI NEVER automates the login and NEVER types or
// handles the user's credentials — only the resulting authorization code.
//
// Run it ONCE per provider. The client id / secret must ALREADY be set in
// local-dev/.env.test before you run this; the refresh token it prints is the
// OUTPUT you then store (locally in .env.test, and in CI as an Actions secret).
//
// Box is special: it uses a Client Credentials Grant (service account, no user
// consent, no refresh token), so for box this only verifies the grant works.
//
// TEST-ONLY: never touches production credentials; the token/endpoint knowledge
// lives in ./providers.mjs, the shared sandbox foundation.

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'

import {
    PROVIDERS,
    CALLBACK_PORT,
    REDIRECT_URI,
    buildConsentUrl,
    exchangeCodeForTokens,
    boxCcgGrant,
    requiredEnvNames,
    refreshTokenEnvName,
} from './providers.mjs'

const CONSENT_TIMEOUT_MS = 300_000
const CALLBACK_ORIGIN = `http://127.0.0.1:${CALLBACK_PORT}`

async function main() {
    const provider = process.argv[2]
    if (!provider || !PROVIDERS.includes(provider)) {
        printUsage()
        process.exit(1)
    }
    if (!hasClientCredentials(provider)) {
        process.exit(1)
    }
    if (provider === 'box') {
        await mintBox()
        return
    }
    await mintViaConsent(provider)
}

function printUsage() {
    console.error('Usage: node scripts/drive-sandbox/mint.mjs <provider>')
    console.error('   or: pnpm run drive:sandbox:mint <provider>')
    console.error('')
    console.error(`Valid providers: ${PROVIDERS.join(', ')}`)
}

// The client id / secret (and Box's enterprise id) must be present BEFORE we can
// mint. The refresh token is the OUTPUT of this flow, so it is never required
// here — filter it out of the provider's required-env list before checking.
function hasClientCredentials(provider) {
    const refreshName = refreshTokenEnvName(provider)
    const needed = requiredEnvNames(provider).filter(
        name => name !== refreshName,
    )
    const missing = needed.filter(name => !process.env[name])
    if (missing.length === 0) {
        return true
    }
    console.error(`✖ ${provider}: missing client credentials.`)
    console.error('')
    console.error('Set these in local-dev/.env.test before minting:')
    console.error('')
    for (const name of missing) {
        console.error(`  ${name}=...`)
    }
    console.error('')
    return false
}

// Box has no consent step: a Client Credentials Grant mints a service-account
// token from the client id / secret / enterprise id, with no user and no
// refresh token. We just prove the grant works, then report there is nothing
// to store.
async function mintBox() {
    const { accessToken } = await boxCcgGrant()
    if (!accessToken) {
        throw new Error('Box CCG returned no access token — check credentials.')
    }
    console.log('✓ Box is configured — Client Credentials Grant verified.')
    console.log('')
    console.log('Box needs NO refresh token. Its access token is minted fresh')
    console.log('on every run from the client id / secret / enterprise id you')
    console.log('already set in local-dev/.env.test — nothing to store.')
    console.log('')
    console.log('Box setup is complete.')
}

// dropbox / google-drive / one-drive: authorization-code consent. Open a
// localhost listener for the redirect, send the human to the consent screen,
// catch the code, and exchange it for a durable refresh token.
async function mintViaConsent(provider) {
    const state = randomUUID()
    const consentUrl = buildConsentUrl(provider, state)
    const { server, codePromise } = createCallbackServer(state)
    try {
        await listen(server, CALLBACK_PORT, '127.0.0.1')
        console.log(`Minting a refresh token for "${provider}".`)
        console.log('')
        console.log('Open this URL in your browser and approve access:')
        console.log('')
        console.log(`  ${consentUrl}`)
        console.log('')
        openInBrowser(consentUrl)
        console.log(`Waiting for the redirect to ${REDIRECT_URI} …`)
        console.log(
            '(Up to 5 minutes. Approve the consent screen to continue.)',
        )
        const timeoutMessage = `Timed out waiting for the OAuth redirect. Re-run and approve access in your browser; ensure ${REDIRECT_URI} is a registered redirect URI.`
        const code = await withTimeout(
            codePromise,
            CONSENT_TIMEOUT_MS,
            timeoutMessage,
        )
        console.log('')
        console.log('✓ Authorization code received — exchanging for tokens …')
        const tokens = await exchangeCodeForTokens(provider, code)
        reportTokens(provider, tokens)
    } finally {
        server.close()
        server.closeAllConnections?.()
    }
}

function reportTokens(provider, tokens) {
    if (!tokens.refreshToken) {
        console.error('✖ No refresh token was returned by the provider.')
        console.error('')
        console.error('Common causes:')
        console.error('  • The consent did not grant offline access.')
        console.error(
            '  • A grant already existed, so no new refresh token was',
        )
        console.error('    issued. For Google, re-run so the consent prompt')
        console.error('    reappears (prompt=consent is already set for you).')
        console.error('  • For OneDrive, ensure "offline_access" was approved.')
        process.exitCode = 1
        return
    }
    const envName = refreshTokenEnvName(provider)
    console.log('✓ Success — your durable refresh token:')
    console.log('')
    console.log(`  ${tokens.refreshToken}`)
    console.log('')
    console.log('Store it in two places —')
    console.log('')
    console.log('1) Local — add this line to local-dev/.env.test:')
    console.log('')
    console.log(`   ${envName}=${tokens.refreshToken}`)
    console.log('')
    console.log('2) CI — set it as a GitHub Actions secret (paste the value')
    console.log('   when prompted; never put the token on the command line):')
    console.log('')
    console.log(`   gh secret set ${envName}`)
    console.log('')
}

// The localhost redirect catcher. Resolves with the authorization code once the
// provider redirects back with a matching state; rejects on a provider error, a
// state mismatch (CSRF guard), or a missing code.
function createCallbackServer(expectedState) {
    let resolveCode
    let rejectCode
    const codePromise = new Promise((resolve, reject) => {
        resolveCode = resolve
        rejectCode = reject
    })
    // Swallow a late settlement (e.g. a request that lands after a timeout has
    // already unwound the flow) so it never becomes an unhandledRejection.
    codePromise.catch(() => undefined)

    const server = createServer((req, res) => {
        const requestUrl = new URL(req.url, CALLBACK_ORIGIN)
        if (requestUrl.pathname !== '/callback') {
            writeResponse(res, 404, 'text/plain; charset=utf-8', 'Not found')
            return
        }
        const params = requestUrl.searchParams
        const oauthError = params.get('error')
        if (oauthError) {
            const description = params.get('error_description') || ''
            const detail =
                escapeHtml(description) || 'The provider reported an error.'
            const errorHtml = page(
                `✖ ${escapeHtml(oauthError)}`,
                'Authorization failed',
                detail,
            )
            writeResponse(res, 400, 'text/html; charset=utf-8', errorHtml)
            const suffix = description ? ` — ${description}` : ''
            rejectCode(new Error(`consent failed: ${oauthError}${suffix}`))
            return
        }
        if (params.get('state') !== expectedState) {
            const errorHtml = page(
                '✖ State mismatch',
                'Rejected',
                'The state value did not match — aborting for safety.',
            )
            writeResponse(res, 400, 'text/html; charset=utf-8', errorHtml)
            rejectCode(new Error('state mismatch (possible CSRF) — aborted'))
            return
        }
        const code = params.get('code')
        if (!code) {
            const errorHtml = page(
                '✖ Missing code',
                'Rejected',
                'No authorization code was present in the callback.',
            )
            writeResponse(res, 400, 'text/html; charset=utf-8', errorHtml)
            rejectCode(new Error('callback contained no authorization code'))
            return
        }
        const okHtml = page(
            '✓ Connected',
            'Connected',
            'You can close this tab and return to your terminal.',
        )
        writeResponse(res, 200, 'text/html; charset=utf-8', okHtml)
        resolveCode(code)
    })
    return { server, codePromise }
}

function writeResponse(res, status, contentType, body) {
    res.writeHead(status, { 'Content-Type': contentType, Connection: 'close' })
    res.end(body)
}

function page(heading, title, message) {
    return `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
    </head>
    <body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b0f;color:#e7e7ea;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
        <main style="max-width:32rem;padding:2rem;text-align:center">
            <h1 style="margin:0 0 .5rem;font-size:1.5rem">${heading}</h1>
            <p style="margin:0;opacity:.75;line-height:1.5">${message}</p>
        </main>
    </body>
</html>`
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
}

function listen(server, port, host) {
    return new Promise((resolve, reject) => {
        const onError = reject
        server.once('error', onError)
        server.listen(port, host, () => {
            server.removeListener('error', onError)
            resolve()
        })
    })
}

function withTimeout(promise, ms, message) {
    let timer
    const timeout = new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms)
    })
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// Best-effort: hand the URL to the OS opener. A failure here is non-fatal — the
// URL is printed above as the manual fallback — so both a synchronous throw and
// an asynchronous spawn 'error' (e.g. missing xdg-open) are ignored.
function openInBrowser(url) {
    let command = 'xdg-open'
    let args = [url]
    if (process.platform === 'win32') {
        command = 'cmd'
        args = ['/c', 'start', '', url]
    } else if (process.platform === 'darwin') {
        command = 'open'
        args = [url]
    }
    try {
        const child = spawn(command, args, { stdio: 'ignore', detached: true })
        child.once('error', () => undefined)
        child.unref()
    } catch {
        // Ignored — the printed URL is the fallback.
    }
}

main().catch(error => {
    console.error(`\n✖ ${error && error.message ? error.message : error}`)
    process.exitCode = 1
})
