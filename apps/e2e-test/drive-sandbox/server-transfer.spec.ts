// All four cloud providers proven through the REAL @upup/server HTTP surface.
//
// The vitest live suite (packages/server/tests/integration/
// drive-clients-live.integration.test.ts) already proves drive-clients.ts
// list/download byte-integrity by calling those functions DIRECTLY. This
// Playwright layer proves the *same* real sandbox credentials work through the
// HTTP handler: route dispatch (handler.ts) -> Responder -> drive-routes auth
// -> drive->S3 transfer into a real MinIO bucket.
//
// Injection point (no interactive OAuth popup, no trust-model change):
// handleListFiles/handleFileTransfer read the provider access token from
// config.tokenStore keyed by resolveUserId()+provider (drive-routes.ts:29-51,
// 91-111) — the OAuth callback is merely what normally WRITES that token via
// setTokens (oauth.ts:235). So we mint a REAL access token (Box CCG /
// Dropbox|Google refresh grant / OneDrive pre-injected token) and pre-seed the
// SAME store with the public setTokens(); the routes then consume it through
// getTokens() identically to a post-OAuth request. getUserId is set to a fixed
// id — what a real multi-tenant deployment must set, not a bypass flag. No
// mocks, no allowAnonymous*, HMAC/upload-token routes untouched.
//
// OneDrive is access-token-ONLY here: its refresh grant ROTATES the stored
// refresh token, and a spec must never consume shared credential state — CI's
// rotation step and rotate-and-test.mjs inject UPUP_TEST_ONEDRIVE_ACCESS_TOKEN;
// without it the one-drive group skips green.
//
// Gating mirrors the vitest suite: UPUP_DRIVE_SANDBOX=1 + per-provider creds +
// MinIO env -> run; absent -> skip GREEN (loud notice, exit 0); a
// configured-but-broken token throws during mint in beforeAll -> RED.
//
// Run (nightly / manual):
//   dotenv -e local-dev/.env.minio -e local-dev/.env.test -- \
//     pnpm --filter @upup/e2e-test test:e2e:drive-sandbox

import { test, expect, type APIRequestContext } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
    S3Client,
    ListMultipartUploadsCommand,
    ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import {
    createUpupHandler,
    InMemoryTokenStore,
    setTokens,
    type TokenStore,
    type UpupServerConfig,
} from '@upup/server'
import { toWebRequest, writeWebResponse } from '@upup/server/node-bridge'

// ── Providers under test (kebab wire slugs; camelCase only lives in-app) ────
const PROVIDERS = ['box', 'dropbox', 'google-drive', 'one-drive'] as const
type Provider = (typeof PROVIDERS)[number]

const USER_ID = 'drive-sandbox-e2e'
const SANDBOX_FOLDER = 'upup-sandbox-fixtures'

// ── Real token minting (inlined + typed, mirroring the vitest live suite;
//    the server test-tree typecheck cannot import providers.mjs untyped) ─────
const AUTH: Record<
    Provider,
    {
        accessTokenEnv: string
        clientIdEnv: string
        clientSecretEnv: string
        // Box: enterprise id (client-credentials). Others: refresh token.
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

function env(name: string): string | undefined {
    return process.env[name]
}

function requireEnv(name: string): string {
    const value = process.env[name]
    if (!value) throw new Error(`missing env ${name}`)
    return value
}

// Configured = a ready-made access token OR the full mint triplet — EXCEPT
// one-drive, which is access-token-ONLY here: its refresh grant ROTATES the
// stored refresh token, and this spec must never consume shared credential
// state. CI's rotation step and rotate-and-test.mjs inject the shortcut.
function isConfigured(provider: Provider): boolean {
    const c = AUTH[provider]
    if (env(c.accessTokenEnv)) return true
    if (provider === 'one-drive') return false
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
            `sandbox token mint failed: ${res.status} ${res.statusText} at ${tokenUrl} - ${detail}`,
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

// A fresh access token for a provider. The *_ACCESS_TOKEN shortcut short-circuits
// with zero network; Box uses a client-credentials enterprise grant; Dropbox and
// Google exchange a long-lived refresh token; OneDrive is access-token-only here.
async function mintAccessToken(provider: Provider): Promise<string> {
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
    if (provider === 'one-drive') {
        // Guarded by isConfigured — reaching here without the shortcut is a bug.
        return requireEnv(c.accessTokenEnv)
    }
    const refreshTokenUrls: Record<'dropbox' | 'google-drive', string> = {
        dropbox: 'https://api.dropboxapi.com/oauth2/token',
        'google-drive': 'https://oauth2.googleapis.com/token',
    }
    return requestToken(refreshTokenUrls[provider], {
        grant_type: 'refresh_token',
        refresh_token: requireEnv(c.thirdSecretEnv),
        client_id: clientId,
        client_secret: clientSecret,
    })
}

// ── Fixtures: committed bytes are the source of truth (read via fs, same as
//    the vitest suite — no import of the untyped fixtures.mjs) ───────────────
function sha256(bytes: Uint8Array): string {
    return createHash('sha256').update(bytes).digest('hex')
}

const FIXTURES_DIR = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../scripts/drive-sandbox/fixtures',
)

type Fixture = {
    name: string
    mimeType: string
    bytes: Uint8Array
    sha256: string
}

function loadFixture(name: string, mimeType: string): Fixture {
    const bytes = new Uint8Array(readFileSync(join(FIXTURES_DIR, name)))
    return { name, mimeType, bytes, sha256: sha256(bytes) }
}

// upup-sandbox-hello.txt (UTF-8 text incl. a multibyte char) +
// upup-sandbox-bytes.bin (256-byte 0x00–0xFF blob) — together they prove the
// list->transfer pipe is byte-exact for both text and non-textual binary.
const FIXTURES: readonly Fixture[] = [
    loadFixture('upup-sandbox-hello.txt', 'text/plain'),
    loadFixture('upup-sandbox-bytes.bin', 'application/octet-stream'),
]

// ── Large fixture: TS twin of scripts/drive-sandbox/fixtures.mjs — the shared
//    sha256 pin is the cross-implementation drift guard (mismatch = throw
//    before any network call) ────────────────────────────────────────────────
const LARGE_FIXTURE_SEED = 'upup-sandbox-large-v1'
const LARGE_FIXTURE_SIZE = 6 * 1024 * 1024 + 45
const LARGE_FIXTURE_SHA256 =
    'a97b029edbb8bdd512a6980623272921ed4a53ea0d3b61f8cf01cbaa9b94ef3b'
const LARGE_FIXTURE_NAME = `upup-sandbox-large-${LARGE_FIXTURE_SHA256.slice(0, 8)}.bin`

function generateLargeFixtureBytes(): Uint8Array {
    const out = new Uint8Array(LARGE_FIXTURE_SIZE)
    let offset = 0
    for (let block = 0; offset < LARGE_FIXTURE_SIZE; block++) {
        const digest = createHash('sha256')
            .update(`${LARGE_FIXTURE_SEED}:${block}`)
            .digest()
        const take = Math.min(digest.length, LARGE_FIXTURE_SIZE - offset)
        out.set(digest.subarray(0, take), offset)
        offset += take
    }
    if (sha256(out) !== LARGE_FIXTURE_SHA256) {
        throw new Error(
            'large-fixture generator drifted from its sha256 pin (must match scripts/drive-sandbox/fixtures.mjs)',
        )
    }
    return out
}

function minioClient(): S3Client {
    return new S3Client({
        region: requireEnv('UPUP_E2E_REGION'),
        endpoint: requireEnv('UPUP_E2E_ENDPOINT'),
        forcePathStyle: true,
        credentials: {
            accessKeyId: requireEnv('MINIO_ROOT_USER'),
            secretAccessKey: requireEnv('MINIO_ROOT_PASSWORD'),
        },
    })
}

async function countOpenMultipartUploads(): Promise<number> {
    const res = await minioClient().send(
        new ListMultipartUploadsCommand({
            Bucket: requireEnv('UPUP_E2E_BUCKET'),
        }),
    )
    return res.Uploads?.length ?? 0
}

async function countObjectsWithSuffix(suffix: string): Promise<number> {
    let count = 0
    let token: string | undefined
    do {
        const res = await minioClient().send(
            new ListObjectsV2Command({
                Bucket: requireEnv('UPUP_E2E_BUCKET'),
                ContinuationToken: token,
            }),
        )
        count += (res.Contents ?? []).filter(o =>
            o.Key?.endsWith(suffix),
        ).length
        token = res.IsTruncated ? res.NextContinuationToken : undefined
    } while (token)
    return count
}

// ── Env gating ──────────────────────────────────────────────────────────────
const MINIO_ENV = [
    'UPUP_E2E_BUCKET',
    'UPUP_E2E_REGION',
    'UPUP_E2E_ENDPOINT',
    'MINIO_ROOT_USER',
    'MINIO_ROOT_PASSWORD',
] as const
const minioReady = MINIO_ENV.every(k => Boolean(process.env[k]))
const sandboxOn = process.env.UPUP_DRIVE_SANDBOX === '1'
const enabled = Object.fromEntries(
    PROVIDERS.map(p => [p, sandboxOn && minioReady && isConfigured(p)]),
) as Record<Provider, boolean>
const anyEnabled = PROVIDERS.some(p => enabled[p])

if (!anyEnabled) {
    const why = !sandboxOn
        ? 'UPUP_DRIVE_SANDBOX!=1'
        : !minioReady
          ? 'MinIO env missing (UPUP_E2E_*/MINIO_ROOT_*)'
          : 'no per-provider creds (UPUP_TEST_BOX_* / UPUP_TEST_DROPBOX_* / UPUP_TEST_GDRIVE_* / UPUP_TEST_ONEDRIVE_*)'
    // Loud, single-line skip notice — the run still exits 0 (all tests skip).
    console.log(
        `[drive-sandbox-e2e] SKIP (green): ${why}. See docs/drive-sandbox-setup.md.`,
    )
}

// ── One real in-process @upup/server wired to the live MinIO, shared by both
//    provider groups; the tokenStore is seeded with real minted tokens ───────
function buildConfig(store: TokenStore): UpupServerConfig {
    return {
        storage: {
            type: 'aws',
            bucket: requireEnv('UPUP_E2E_BUCKET'),
            region: requireEnv('UPUP_E2E_REGION'),
            endpoint: requireEnv('UPUP_E2E_ENDPOINT'),
            forcePathStyle: true,
            accessKeyId: requireEnv('MINIO_ROOT_USER'),
            secretAccessKey: requireEnv('MINIO_ROOT_PASSWORD'),
        },
        uploadTokenSecret:
            process.env.UPUP_UPLOAD_TOKEN_SECRET ??
            'drive-sandbox-e2e-upload-token-secret-not-for-prod',
        tokenStore: store,
        // A real identity resolver (what a multi-tenant deployment sets) — NOT a
        // bypass flag. Every request maps to the one seeded sandbox user.
        getUserId: async () => USER_ID,
    }
}

let server: Server | undefined
let baseURL = ''

test.beforeAll(async () => {
    if (!anyEnabled) return

    const store = new InMemoryTokenStore()
    // Mint both providers in parallel (independent APIs). A
    // broken-but-configured token throws HERE -> the run goes RED.
    await Promise.all(
        PROVIDERS.filter(provider => enabled[provider]).map(async provider => {
            const accessToken = await mintAccessToken(provider)
            await setTokens(store, USER_ID, provider, { accessToken })
        }),
    )

    const handler = createUpupHandler(buildConfig(store))
    server = createServer((req, res) => {
        void (async () => {
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(chunk as Buffer)
            const port = (server!.address() as AddressInfo).port
            const webReq = toWebRequest({
                url: `http://127.0.0.1:${port}${req.url ?? '/'}`,
                method: req.method ?? 'GET',
                headers: req.headers,
                body: chunks.length ? Buffer.concat(chunks) : undefined,
            })
            const webRes = await handler(webReq)
            await writeWebResponse(
                {
                    status: (code: number) => {
                        res.statusCode = code
                    },
                    setHeader: (name: string, value: string) => {
                        res.setHeader(name, value)
                    },
                    send: (buf: Buffer) => {
                        res.end(buf)
                    },
                },
                webRes,
            )
        })().catch((err: unknown) => {
            res.statusCode = 500
            res.end(String(err))
        })
    })
    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve))
    baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

test.afterAll(async () => {
    if (server)
        await new Promise<void>(resolve => server!.close(() => resolve()))
})

// ── HTTP helpers driving the real routes ────────────────────────────────────
type ListedFile = {
    id: string
    name: string
    size?: number
    mimeType?: string
    isFolder: boolean
    modifiedAt?: string
}
type ListResponse = { provider: string; files: ListedFile[] }
type TransferResponse = {
    provider: string
    key: string
    name: string
    size: number
    type: string
    url: string
}

async function listFiles(
    request: APIRequestContext,
    provider: Provider,
    folderId?: string,
): Promise<ListedFile[]> {
    const url =
        `${baseURL}/files/${provider}` +
        (folderId ? `?folderId=${encodeURIComponent(folderId)}` : '')
    const res = await request.get(url)
    expect(
        res.ok(),
        `GET /files/${provider} -> HTTP ${res.status()}`,
    ).toBeTruthy()
    const body = (await res.json()) as ListResponse
    expect(body.provider).toBe(provider)
    return body.files
}

// ── Suites (one per provider; conditional-skips GREEN unless enabled) ────────
for (const provider of PROVIDERS) {
    test.describe(`server-mode drive list + transfer through @upup/server — ${provider}`, () => {
        test.skip(
            () => !enabled[provider],
            `${provider} drive-sandbox not configured (needs UPUP_DRIVE_SANDBOX=1 + creds + MinIO up)`,
        )

        test(`GET /files/${provider} lists the seeded "${SANDBOX_FOLDER}" folder and both fixtures with exact byte sizes`, async ({
            request,
        }) => {
            const root = await listFiles(request, provider)
            const folder = root.find(f => f.name === SANDBOX_FOLDER)
            expect(
                folder,
                `"${SANDBOX_FOLDER}" present in ${provider} root listing`,
            ).toBeDefined()
            expect(folder!.isFolder).toBe(true)

            const contents = await listFiles(request, provider, folder!.id)
            for (const fixture of FIXTURES) {
                const listed = contents.find(f => f.name === fixture.name)
                expect(
                    listed,
                    `${fixture.name} listed inside the ${provider} sandbox folder`,
                ).toBeDefined()
                expect(listed!.isFolder).toBe(false)
                // Some providers omit size on listings; assert it only when present.
                if (typeof listed!.size === 'number') {
                    expect(listed!.size).toBe(fixture.bytes.length)
                }
            }
        })

        test(`POST /files/${provider}/transfer streams every fixture into MinIO byte-exact with its declared content-type`, async ({
            request,
        }) => {
            const root = await listFiles(request, provider)
            const folder = root.find(f => f.name === SANDBOX_FOLDER)
            expect(folder, `"${SANDBOX_FOLDER}" present`).toBeDefined()
            const contents = await listFiles(request, provider, folder!.id)

            for (const fixture of FIXTURES) {
                const listed = contents.find(f => f.name === fixture.name)
                expect(
                    listed,
                    `${fixture.name} present in ${provider} folder to transfer`,
                ).toBeDefined()

                const transferRes = await request.post(
                    `${baseURL}/files/${provider}/transfer`,
                    {
                        data: {
                            fileId: listed!.id,
                            fileName: fixture.name,
                            size: fixture.bytes.length,
                            mimeType: fixture.mimeType,
                        },
                    },
                )
                expect(
                    transferRes.ok(),
                    `POST /files/${provider}/transfer (${fixture.name}) -> HTTP ${transferRes.status()}`,
                ).toBeTruthy()
                const body = (await transferRes.json()) as TransferResponse
                expect(body.provider).toBe(provider)
                expect(body.name).toBe(fixture.name)
                expect(body.key.endsWith(`-${fixture.name}`)).toBe(true)
                expect(body.size).toBe(fixture.bytes.length)
                expect(body.url, 'presigned MinIO URL returned').toBeTruthy()

                const objectRes = await request.get(body.url)
                expect(objectRes.ok()).toBeTruthy()
                // Content-Type fidelity: what a consuming app will render with.
                expect(objectRes.headers()['content-type']).toBe(
                    fixture.mimeType,
                )
                const downloaded = new Uint8Array(await objectRes.body())
                expect(downloaded.length).toBe(fixture.bytes.length)
                expect(sha256(downloaded)).toBe(fixture.sha256)
            }
        })

        test(`POST /files/${provider}/transfer streams the >5 MiB fixture through the multipart path byte-exact, leaving no incomplete multipart upload`, async ({
            request,
        }) => {
            test.setTimeout(240_000)
            const expectedBytes = generateLargeFixtureBytes()
            const root = await listFiles(request, provider)
            const folder = root.find(f => f.name === SANDBOX_FOLDER)
            expect(folder, `"${SANDBOX_FOLDER}" present`).toBeDefined()
            const contents = await listFiles(request, provider, folder!.id)
            const listed = contents.find(f => f.name === LARGE_FIXTURE_NAME)
            expect(
                listed,
                `${LARGE_FIXTURE_NAME} seeded in ${provider} (run drive:sandbox:seed)`,
            ).toBeDefined()

            const mpuBefore = await countOpenMultipartUploads()
            const transferRes = await request.post(
                `${baseURL}/files/${provider}/transfer`,
                {
                    data: {
                        fileId: listed!.id,
                        fileName: LARGE_FIXTURE_NAME,
                        size: LARGE_FIXTURE_SIZE,
                        mimeType: 'application/octet-stream',
                    },
                },
            )
            expect(
                transferRes.ok(),
                `POST /files/${provider}/transfer (large) -> HTTP ${transferRes.status()}`,
            ).toBeTruthy()
            const body = (await transferRes.json()) as TransferResponse
            expect(body.size).toBe(LARGE_FIXTURE_SIZE)

            const objectRes = await request.get(body.url)
            expect(objectRes.ok()).toBeTruthy()
            const downloaded = new Uint8Array(await objectRes.body())
            expect(downloaded.length).toBe(expectedBytes.length)
            expect(sha256(downloaded)).toBe(LARGE_FIXTURE_SHA256)
            // Completed transfer leaves no incomplete multipart upload behind.
            expect(await countOpenMultipartUploads()).toBe(mpuBefore)
        })
    })
}
