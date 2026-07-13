// Live drive-clients integration suite. Drives the REAL getDriveClient() surface
// (packages/server/src/drive-clients.ts) against each cloud provider's PRODUCTION
// API using disposable sandbox accounts — no mocks, no local doubles. It proves
// the list -> download pipe is real end-to-end for every provider: the seeded
// fixture folder is discoverable in the account root, both fixture files list
// inside it, each downloads byte-exact (sha256 matched against the committed
// on-disk fixture — the single source of truth the seeder uploaded), and the
// search path builds/escapes/parses without error.
//
// Gated by UPUP_DRIVE_SANDBOX=1 AND per-provider secrets (see
// docs/drive-sandbox-setup.md for how to mint them). With neither present a
// normal `pnpm test` skips every provider GREEN. A provider whose secrets ARE
// configured but whose token is broken does NOT skip — minting happens in
// beforeAll, so a bad token throws there and the suite goes RED (configured but
// broken is a real signal, never silently swallowed).
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createHash } from 'node:crypto'
import {
    getDriveClient,
    type DriveClient,
    type DriveFile,
} from '../../src/drive-clients'
import { UpupNetworkError } from '@useupup/core'

// The four wire slugs, as a const tuple so each element is assignable to
// getDriveClient's OAuthProvider parameter.
const PROVIDERS = ['box', 'dropbox', 'google-drive', 'one-drive'] as const
type ProviderSlug = (typeof PROVIDERS)[number]

const SANDBOX_ON = process.env.UPUP_DRIVE_SANDBOX === '1'

// ── Env plumbing ─────────────────────────────────────────────────────────

function env(name: string): string | undefined {
    return process.env[name]
}

function requireEnv(name: string): string {
    const value = process.env[name]
    if (!value) {
        throw new Error(`missing env ${name} for sandbox token mint`)
    }
    return value
}

const AUTH: Record<
    ProviderSlug,
    {
        accessTokenEnv: string
        clientIdEnv: string
        clientSecretEnv: string
        // enterpriseId for box (client-credentials); refresh token otherwise.
        thirdSecretEnv: string
    }
> = {
    box: {
        accessTokenEnv: 'UPUP_TEST_BOX_ACCESS_TOKEN',
        clientIdEnv: 'UPUP_TEST_BOX_CLIENT_ID',
        clientSecretEnv: 'UPUP_TEST_BOX_CLIENT_SECRET',
        thirdSecretEnv: 'UPUP_TEST_BOX_ENTERPRISE_ID',
    },
    dropbox: {
        accessTokenEnv: 'UPUP_TEST_DROPBOX_ACCESS_TOKEN',
        clientIdEnv: 'UPUP_TEST_DROPBOX_APP_KEY',
        clientSecretEnv: 'UPUP_TEST_DROPBOX_APP_SECRET',
        thirdSecretEnv: 'UPUP_TEST_DROPBOX_REFRESH_TOKEN',
    },
    'google-drive': {
        accessTokenEnv: 'UPUP_TEST_GDRIVE_ACCESS_TOKEN',
        clientIdEnv: 'UPUP_TEST_GDRIVE_CLIENT_ID',
        clientSecretEnv: 'UPUP_TEST_GDRIVE_CLIENT_SECRET',
        thirdSecretEnv: 'UPUP_TEST_GDRIVE_REFRESH_TOKEN',
    },
    'one-drive': {
        accessTokenEnv: 'UPUP_TEST_ONEDRIVE_ACCESS_TOKEN',
        clientIdEnv: 'UPUP_TEST_ONEDRIVE_CLIENT_ID',
        clientSecretEnv: 'UPUP_TEST_ONEDRIVE_CLIENT_SECRET',
        thirdSecretEnv: 'UPUP_TEST_ONEDRIVE_REFRESH_TOKEN',
    },
}

// Configured = a ready-made access token, OR the full mint triplet (client id +
// secret + [enterprise id for box | refresh token for the others]).
// OneDrive divergence: the Playwright HTTP-surface spec
// (server-transfer.spec.ts) is access-token-ONLY for one-drive and never
// consumes its rotating refresh token. THIS suite may refresh one-drive in
// sandboxAccessToken; rotate-and-test.mjs injects a fresh access token first
// so the stored refresh token is not rotated away here.
function isConfigured(provider: ProviderSlug): boolean {
    const c = AUTH[provider]
    if (env(c.accessTokenEnv)) return true
    return Boolean(
        env(c.clientIdEnv) && env(c.clientSecretEnv) && env(c.thirdSecretEnv),
    )
}

async function requestToken(
    tokenUrl: string,
    form: Record<string, string>,
): Promise<string> {
    const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(form).toString(),
    })
    if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 300)
        throw new Error(
            `sandbox token mint failed: ${res.status} ${res.statusText} ` +
                `at ${tokenUrl} - ${detail}`,
        )
    }
    const data = (await res.json()) as { access_token?: string }
    if (!data.access_token) {
        throw new Error(
            `sandbox token mint returned no access_token from ${tokenUrl}`,
        )
    }
    return data.access_token
}

// Mint (or pass through) a sandbox access token. The *_ACCESS_TOKEN shortcut
// short-circuits with zero network; otherwise Box uses a client-credentials
// enterprise grant and the rest exchange a long-lived refresh token.
async function sandboxAccessToken(provider: ProviderSlug): Promise<string> {
    const c = AUTH[provider]
    const shortcut = env(c.accessTokenEnv)
    if (shortcut) return shortcut

    const clientId = requireEnv(c.clientIdEnv)
    const clientSecret = requireEnv(c.clientSecretEnv)

    if (provider === 'box') {
        return requestToken('https://api.box.com/oauth2/token', {
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            box_subject_type: 'enterprise',
            box_subject_id: requireEnv(c.thirdSecretEnv),
        })
    }

    const tenant = env('UPUP_TEST_ONEDRIVE_TENANT') ?? 'consumers'
    const refreshTokenUrls: Record<Exclude<ProviderSlug, 'box'>, string> = {
        dropbox: 'https://api.dropboxapi.com/oauth2/token',
        'google-drive': 'https://oauth2.googleapis.com/token',
        'one-drive': `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    }
    return requestToken(refreshTokenUrls[provider], {
        grant_type: 'refresh_token',
        refresh_token: requireEnv(c.thirdSecretEnv),
        client_id: clientId,
        client_secret: clientSecret,
    })
}

// ── Fixtures (committed bytes are the source of truth) ────────────────────

function sha256(bytes: Uint8Array): string {
    return createHash('sha256').update(bytes).digest('hex')
}

const FIXTURES_DIR = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../scripts/drive-sandbox/fixtures',
)

const SANDBOX_FOLDER = 'upup-sandbox-fixtures'

type Fixture = { name: string; bytes: Uint8Array; sha256: string }

function loadFixture(name: string): Fixture {
    const bytes = new Uint8Array(readFileSync(join(FIXTURES_DIR, name)))
    return { name, bytes, sha256: sha256(bytes) }
}

const FIXTURES: readonly Fixture[] = [
    loadFixture('upup-sandbox-hello.txt'),
    loadFixture('upup-sandbox-bytes.bin'),
    loadFixture("upup-sandbox-ünï 'q' & (1).txt"),
]

// ── Stream + discovery helpers ───────────────────────────────────────────

async function drainStream(
    stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(value)
        total += value.byteLength
    }
    const out = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
        out.set(chunk, offset)
        offset += chunk.byteLength
    }
    return out
}

async function findSandboxFolder(
    client: DriveClient,
    accessToken: string,
): Promise<DriveFile | undefined> {
    const root = await client.listFiles(accessToken, {})
    return root.find(entry => entry.name === SANDBOX_FOLDER)
}

// ── Suites (one per provider; skips green unless enabled + configured) ────

for (const provider of PROVIDERS) {
    const enabled = SANDBOX_ON && isConfigured(provider)
    describe.skipIf(!enabled)(`drive-clients live — ${provider}`, () => {
        const client = getDriveClient(provider)
        let accessToken = ''

        beforeAll(async () => {
            accessToken = await sandboxAccessToken(provider)
        })

        it(`a client can list the seeded sandbox folder in ${provider} root, and it is marked as a folder`, async () => {
            const folder = await findSandboxFolder(client, accessToken)
            expect(folder).toBeDefined()
            expect(folder?.isFolder).toBe(true)
        })

        it(`a client can list both fixture files inside the ${provider} sandbox folder`, async () => {
            const folder = await findSandboxFolder(client, accessToken)
            expect(folder).toBeDefined()
            if (!folder) return
            const contents = await client.listFiles(accessToken, {
                folderId: folder.id,
            })
            for (const fixture of FIXTURES) {
                const listed = contents.find(f => f.name === fixture.name)
                expect(listed).toBeDefined()
                if (!listed) continue
                expect(listed.isFolder).toBe(false)
                // A provider that reports a byte size must report the true one;
                // some omit size on listings, in which case this is skipped.
                if (typeof listed.size === 'number') {
                    expect(listed.size).toBe(fixture.bytes.length)
                }
            }
        })

        it(`a client can download each fixture and the bytes are byte-exact (sha256 matches the committed fixture) from ${provider}`, async () => {
            const folder = await findSandboxFolder(client, accessToken)
            expect(folder).toBeDefined()
            if (!folder) return
            const contents = await client.listFiles(accessToken, {
                folderId: folder.id,
            })
            for (const fixture of FIXTURES) {
                const listed = contents.find(f => f.name === fixture.name)
                expect(listed).toBeDefined()
                if (!listed) continue
                const download = await client.fetchFile(accessToken, {
                    fileId: listed.id,
                })
                const bytes = await drainStream(download.stream)
                expect(bytes.length).toBe(fixture.bytes.length)
                expect(sha256(bytes)).toBe(fixture.sha256)
            }
        })

        it(`a search query returns an array, exercising the ${provider} search/escaping path`, async () => {
            const results = await client.listFiles(accessToken, {
                search: 'upup-sandbox',
            })
            // Deliberately no containment assertion: some providers (notably
            // Box) index newly-uploaded files with a delay, so checking the
            // fixture is present would be flaky. The value here is exercising
            // the search query-building / escaping / response-parsing path
            // end-to-end without a timing-dependent expectation.
            expect(Array.isArray(results)).toBe(true)
        })

        it(`a unicode search term survives the ${provider} query-escaping path end-to-end`, async () => {
            const results = await client.listFiles(accessToken, {
                search: "ünï 'q' & (1)",
            })
            // Deliberately a weak assert: provider search indexing/semantics
            // vary, so the point is only that the escaped unicode query does not
            // 400 or throw — not that it returns any particular match.
            expect(Array.isArray(results)).toBe(true)
        })

        it(`an invalid access token surfaces as a 401 UpupNetworkError from ${provider}, exercising the driveFetch reauth sentinel`, async () => {
            // A deliberately-invalid bearer token: every provider answers 401,
            // which driveFetch must surface as the typed UpupNetworkError(401)
            // sentinel drive-routes instanceof-checks to trigger reauth (F-747).
            // Only the mocked unit tests otherwise prove this boundary; here it
            // is proven against the real API, and it is deterministic (a bad
            // token is 401 with no indexing/timing dependence). One request.
            const err = await client
                .listFiles('upup-invalid-sandbox-token', {})
                .then(() => undefined)
                .catch((e: unknown) => e)
            expect(err).toBeInstanceOf(UpupNetworkError)
            expect((err as UpupNetworkError).status).toBe(401)
        })

        if (provider === 'google-drive') {
            it('a native Google Doc lists cleanly (document mimeType, not a folder) from google-drive', async () => {
                const folder = await findSandboxFolder(client, accessToken)
                expect(folder).toBeDefined()
                if (!folder) return
                const contents = await client.listFiles(accessToken, {
                    folderId: folder.id,
                })
                const doc = contents.find(
                    f => f.name === 'upup-sandbox-native-doc',
                )
                expect(doc).toBeDefined()
                expect(doc?.isFolder).toBe(false)
                expect(doc?.mimeType).toBe(
                    'application/vnd.google-apps.document',
                )
                // Drive v3 DOES report a size for a native Doc (its storage-quota
                // footprint, ~1 KiB) even though the file has NO downloadable
                // binary content — alt=media 403s. The listing looks ordinary; the
                // no-export limitation only surfaces at transfer time (pinned by
                // the server-transfer e2e spec).
                expect(typeof doc?.size).toBe('number')
            })
        }
    })
}
