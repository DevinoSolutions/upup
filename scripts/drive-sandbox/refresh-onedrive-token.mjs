// scripts/drive-sandbox/refresh-onedrive-token.mjs
//
// OneDrive is the one sandbox provider whose refresh token ROTATES on every use
// (Microsoft invalidates the old one and issues a new one on each refresh, with
// a 90-day sliding inactivity window). If the nightly run minted a token the
// normal way, the rotated value would be thrown away and the stored secret
// would be dead by the next night.
//
// So OneDrive gets a dedicated, CI-only rotation step that runs ONCE per night,
// BEFORE seed/test:
//   1. refresh_token grant → { accessToken, refreshToken:NEW }
//   2. write NEW refresh token back to the repo secret (value on stdin only)
//   3. hand the freshly-minted access token forward via $GITHUB_ENV so the
//      seed + test steps use it directly and never rotate the token again.
//
// It is a NO-OP (clean exit 0) unless it can rotate SAFELY — i.e. OneDrive is
// configured AND a secrets-write PAT + GitHub Actions env are present. Without
// safe write-back it deliberately does nothing (and injects no access token),
// so the live suite skips OneDrive green rather than silently burning the
// stored refresh token. A configured-and-writable token that fails to refresh
// throws (RED) — a dead token is a real signal.

import { spawn } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import {
    isProviderConfigured,
    refreshGrant,
    refreshTokenEnvName,
} from './providers.mjs'

const PROVIDER = 'one-drive'
const ACCESS_TOKEN_ENV = 'UPUP_TEST_ONEDRIVE_ACCESS_TOKEN'

function notice(message) {
    // GitHub Actions annotation when in CI; plain line otherwise.
    if (process.env.GITHUB_ACTIONS === 'true') {
        console.log(`::notice title=OneDrive sandbox::${message}`)
    } else {
        console.log(`[drive-sandbox] ${message}`)
    }
}

function mask(value) {
    if (process.env.GITHUB_ACTIONS === 'true' && value) {
        console.log(`::add-mask::${value}`)
    }
}

function setSecretViaGh(name, value, { repo, token }) {
    return new Promise((resolve, reject) => {
        const child = spawn('gh', ['secret', 'set', name, '--repo', repo], {
            env: { ...process.env, GH_TOKEN: token },
            stdio: ['pipe', 'inherit', 'inherit'],
        })
        child.on('error', reject)
        child.on('close', code =>
            code === 0
                ? resolve()
                : reject(new Error(`gh secret set ${name} exited ${code}`)),
        )
        // Value goes on stdin ONLY — never argv (argv is visible in the process
        // table and can leak into logs).
        child.stdin.write(value)
        child.stdin.end()
    })
}

async function main() {
    if (!isProviderConfigured(PROVIDER)) {
        notice(
            'not configured (no refresh token) — skipping rotation; the live suite will skip OneDrive.',
        )
        return
    }

    const pat = process.env.GH_SECRETS_WRITE_PAT
    const repo = process.env.GITHUB_REPOSITORY
    const githubEnv = process.env.GITHUB_ENV

    if (!pat || !repo || !githubEnv) {
        notice(
            'rotation needs GH_SECRETS_WRITE_PAT + GitHub Actions env — not present, so NOT refreshing (the stored refresh token is left untouched and the live suite skips OneDrive). See docs/drive-sandbox-setup.md.',
        )
        return
    }

    // Single rotation point. A failure here is a REAL signal (dead/expired token).
    const { accessToken, refreshToken } = await refreshGrant(PROVIDER)
    mask(accessToken)
    mask(refreshToken)

    // Persist the rotated refresh token so tomorrow night still authenticates.
    await setSecretViaGh(refreshTokenEnvName(PROVIDER), refreshToken, {
        repo,
        token: pat,
    })

    // Hand the freshly-minted access token to the seed/test steps. They read the
    // UPUP_TEST_<P>_ACCESS_TOKEN shortcut and perform NO further grant, so the
    // token is rotated exactly once per night.
    appendFileSync(githubEnv, `${ACCESS_TOKEN_ENV}=${accessToken}\n`)

    notice(
        `rotated OK — new refresh token written back to secret ${refreshTokenEnvName(
            PROVIDER,
        )}; access token handed to the live suite.`,
    )
}

main().catch(err => {
    console.error(`[drive-sandbox] OneDrive rotation failed: ${err.message}`)
    process.exit(1)
})
