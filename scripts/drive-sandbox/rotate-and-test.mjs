// scripts/drive-sandbox/rotate-and-test.mjs
//
// Local equivalent of the CI's nightly Drive-Sandbox parity flow. Handles
// OneDrive's rotating refresh token safely, then runs BOTH proof layers the
// nightly job runs:
//
//   1. If OneDrive is configured, do ONE refresh grant → new access + refresh
//      token; write the rotated refresh token back to local-dev/.env.test; sync
//      it to the GitHub Actions secret (default-on — the local rotation consumed
//      the token the next nightly OneDrive leg would use, so an unsynced run
//      leaves that leg RED); and inject the fresh access token via
//      UPUP_TEST_ONEDRIVE_ACCESS_TOKEN so seed + both suites reuse it instead of
//      rotating again.
//   2. Seed the four fixture accounts (idempotent).
//   3. Run the vitest live drive-clients integration suite (all 4 providers).
//   4. If MinIO is up on :9100, run the Playwright HTTP-surface layer
//      (@upup/server route dispatch → drive auth → drive→S3 transfer).
//
// Box/Dropbox/GDrive need no rotation — their tokens are stable.
//
// This is the ONE safe local entry point for anything OneDrive-inclusive: it
// injects the access token so the bare seed/vitest paths never consume (and
// rotate away) the stored refresh token via providers.mjs minting.
//
// Usage:
//   pnpm run drive:sandbox                     (dotenv wrapper in package.json)
//   pnpm run drive:sandbox -- --no-sync-github (offline — leaves the CI secret stale)
//   node scripts/drive-sandbox/rotate-and-test.mjs   (if env is already loaded)

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    isProviderConfigured,
    refreshGrant,
    refreshTokenEnvName,
} from './providers.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const ENV_FILE = resolve(ROOT, 'local-dev/.env.test')
const PROVIDER = 'one-drive'

// The Playwright HTTP-surface leg. Loads ONLY .env.minio — provider creds + the
// injected OneDrive access token already live in process.env (the wrapper runs
// under dotenv -e local-dev/.env.test) and pass straight through run()'s env.
const SPEC_CMD =
    'pnpm exec dotenv -e local-dev/.env.minio -- pnpm --filter @upup/e2e-test test:e2e:drive-sandbox'

function log(msg) {
    console.log(`[drive-sandbox] ${msg}`)
}

function run(cmd, timeout = 300_000) {
    execSync(cmd, { cwd: ROOT, env: process.env, stdio: 'inherit', timeout })
}

async function minioHealthy() {
    try {
        const res = await fetch('http://localhost:9100/minio/health/live', {
            signal: AbortSignal.timeout(3000),
        })
        return res.ok
    } catch {
        return false
    }
}

function syncGithubSecret(refreshToken) {
    if (process.argv.includes('--no-sync-github')) {
        log(
            'OneDrive: --no-sync-github — the GitHub secret is now STALE; the next nightly OneDrive leg will go RED until synced',
        )
        return
    }
    try {
        // Value via stdin ONLY — never argv, never printed.
        execSync(
            'gh secret set UPUP_TEST_ONEDRIVE_REFRESH_TOKEN -R DevinoSolutions/upup',
            {
                cwd: ROOT,
                input: refreshToken,
                stdio: ['pipe', 'inherit', 'inherit'],
                timeout: 30_000,
            },
        )
        log(
            'OneDrive: rotated refresh token synced to the GitHub Actions secret',
        )
    } catch {
        log(
            'OneDrive: WARNING — GitHub secret sync failed (gh missing/unauthenticated?). The stored CI token is now STALE; sync it manually before the next nightly.',
        )
    }
}

async function rotateOneDrive() {
    if (!isProviderConfigured(PROVIDER)) {
        log('OneDrive not configured — skipping rotation (suite will skip it)')
        return
    }

    log('OneDrive: refreshing token (single rotation)...')
    const { accessToken, refreshToken } = await refreshGrant(PROVIDER)
    log(
        `OneDrive: got access token (${accessToken.length} chars) + rotated refresh token (${refreshToken.length} chars)`,
    )

    // Write the rotated refresh token back to .env.test so next run still works
    const envName = refreshTokenEnvName(PROVIDER)
    const oldContent = readFileSync(ENV_FILE, 'utf8')
    const oldValue = process.env[envName]
    if (oldValue && oldContent.includes(oldValue)) {
        writeFileSync(ENV_FILE, oldContent.replace(oldValue, refreshToken))
        log(`OneDrive: wrote rotated refresh token back to ${ENV_FILE}`)
        syncGithubSecret(refreshToken)
    } else {
        log(
            `OneDrive: WARNING — could not find old refresh token in ${ENV_FILE}; update it manually`,
        )
    }

    // Set the access token shortcut so the suite skips further grants
    process.env.UPUP_TEST_ONEDRIVE_ACCESS_TOKEN = accessToken
    log('OneDrive: access token injected — suite will use the shortcut')
}

async function main() {
    log('rotating OneDrive token (if configured)...')
    await rotateOneDrive()

    log('seeding fixture accounts (idempotent)...')
    try {
        run('node scripts/drive-sandbox/seed.mjs all', 300_000)
    } catch {
        log('FAILED — see seed output above')
        process.exit(1)
    }

    log('running vitest live suite...')
    try {
        run(
            'pnpm --filter @upup/server exec vitest run tests/integration/drive-clients-live.integration.test.ts',
            120_000,
        )
    } catch {
        log('FAILED — see vitest output above')
        process.exit(1)
    }

    if (await minioHealthy()) {
        log(
            'MinIO healthy on :9100 — running the HTTP-surface Playwright layer...',
        )
        try {
            run(SPEC_CMD, 600_000)
        } catch {
            log('FAILED — see Playwright output above')
            process.exit(1)
        }
        log('DONE — vitest live suite + HTTP-surface layer both passed')
    } else {
        log('MinIO not reachable on :9100 — HTTP-surface layer SKIPPED.')
        log(
            'Boot it with `pnpm run e2e:minio:up`, then re-run `pnpm run drive:sandbox`.',
        )
        log('DONE — vitest live suite passed (HTTP-surface layer skipped)')
    }
}

main().catch(err => {
    console.error(`[drive-sandbox] ${err.message}`)
    process.exit(1)
})
