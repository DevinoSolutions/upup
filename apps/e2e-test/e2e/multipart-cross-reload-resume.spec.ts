// Cross-reload multipart resume, proven end to end against a REAL
// @upupjs/server + a REAL MinIO bucket: kill the page mid-upload, reload,
// resume, and the stored object is byte-identical to the source.
//
// Nothing is faked at the transport layer. The spec boots the repo's own
// presign harness (scripts/upup-e2e-server.mjs — the same process the
// cross-framework gate uses, here with the vite app's origin allowed) and
// drives the harness app's `?scenario=multipart-resume` story, which is the
// only story wired to serverUrl + resumable multipart + crashRecovery.
//
// The ONE piece of network shaping: `/multipart/sign-part` requests for parts
// other than part 1 are HELD (never answered) until the reload, so "reload
// after exactly one part landed" is deterministic instead of a race against a
// localhost MinIO that can finish 16 MiB in a blink. Held requests are never
// answered with fabricated data — the page reload kills them exactly the way a
// real crash kills in-flight requests. Everything else (init, sign-part for
// part 1, every part PUT, resume, complete, abort) is real traffic, observed
// only to count it.
//
// Gating mirrors the drive-sandbox suite: MinIO env present -> run; absent ->
// skip GREEN with a loud notice (so `pnpm run e2e`, which drives this suite
// without the dotenv wrapper, stays green); env present but MinIO or the
// harness unreachable -> RED.
//
// Run:
//   pnpm exec dotenv -e local-dev/.env.minio -- \
//     pnpm --filter @upupjs/e2e-test exec playwright test multipart-cross-reload-resume
// Requires: `pnpm --filter @upupjs/server build` (the harness imports its dist)
// and MinIO up on :9100 (`pnpm run e2e:minio:up`).

import { test, expect, type Page, type Route } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    S3Client,
    GetObjectCommand,
    ListMultipartUploadsCommand,
    AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3'
import { clearCrashRecovery } from './helpers'

// ── Env gating ──────────────────────────────────────────────────────────────
const MINIO_ENV = [
    'UPUP_E2E_BUCKET',
    'UPUP_E2E_REGION',
    'UPUP_E2E_ENDPOINT',
    'MINIO_ROOT_USER',
    'MINIO_ROOT_PASSWORD',
] as const
const minioReady = MINIO_ENV.every(key => Boolean(process.env[key]))

if (!minioReady) {
    // Loud, single-line skip notice — the run still exits 0 (all tests skip).
    console.log(
        '[multipart-resume-e2e] SKIP (green): MinIO env missing (UPUP_E2E_*/MINIO_ROOT_*). ' +
            'Run through `dotenv -e local-dev/.env.minio` with MinIO up on :9100.',
    )
}

function requireEnv(name: string): string {
    const value = process.env[name]
    if (!value) throw new Error(`missing env ${name}`)
    return value
}

// ── The file under test: deterministic bytes so its sha256 is a fixed fact ──
const PART_SIZE = 5 * 1024 * 1024
const FILE_SIZE = 16 * 1024 * 1024 // 4 parts: 5 + 5 + 5 + 1 MiB
const TOTAL_PARTS = Math.ceil(FILE_SIZE / PART_SIZE)

/** xorshift32 fill — incompressible-ish, reproducible, and cheap. */
function seededBytes(size: number, seed: number): Buffer {
    const buffer = Buffer.allocUnsafe(size)
    let x = seed >>> 0
    for (let i = 0; i < size; i++) {
        x ^= x << 13
        x >>>= 0
        x ^= x >>> 17
        x ^= x << 5
        x >>>= 0
        buffer[i] = x & 0xff
    }
    return buffer
}

const SOURCE_BYTES = minioReady
    ? seededBytes(FILE_SIZE, 0x9e3779b9)
    : Buffer.alloc(0)
const SOURCE_SHA256 = createHash('sha256').update(SOURCE_BYTES).digest('hex')

// ── Harness process (the repo's express presign server) ─────────────────────
const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..', '..', '..') // e2e -> e2e-test -> apps -> root
const APP_ORIGIN = 'http://localhost:3333'
// Deliberately NOT :53060 — the cross-framework gate's harness owns that port
// and allows only the six storybook origins, so reusing it would 403 the app.
const HARNESS_PORT = Number(process.env.UPUP_E2E_RESUME_SERVER_PORT ?? 53061)
const HARNESS_URL = `http://localhost:${HARNESS_PORT}`

let harness: ChildProcess | null = null
let fixtureDir = ''
const fixtureNames: string[] = []

async function reachable(url: string): Promise<boolean> {
    try {
        const res = await fetch(url)
        return res.ok
    } catch {
        // upup-catch: "not up yet" is the expected answer while polling.
        return false
    }
}

function minio(): S3Client {
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

/** The bytes MinIO actually holds for `key`, hashed. */
async function storedObject(key: string): Promise<{
    sha256: string
    size: number
}> {
    const res = await minio().send(
        new GetObjectCommand({
            Bucket: requireEnv('UPUP_E2E_BUCKET'),
            Key: key,
        }),
    )
    const chunks: Buffer[] = []
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk))
    }
    const bytes = Buffer.concat(chunks)
    return {
        sha256: createHash('sha256').update(bytes).digest('hex'),
        size: bytes.length,
    }
}

/**
 * Reap the multipart uploads this suite deliberately strands. `persist` mode's
 * whole point is that an interrupted upload survives — so the stale-session
 * test leaves exactly one server-side upload nothing will ever finish (the
 * documented tradeoff an `AbortIncompleteMultipartUpload` lifecycle rule covers
 * in production). The shared dev bucket has no such rule, so the suite cleans
 * up after itself instead of growing an orphan per run.
 */
async function abortStrandedUploads(names: string[]): Promise<void> {
    const Bucket = requireEnv('UPUP_E2E_BUCKET')
    const client = minio()
    const open = await client.send(new ListMultipartUploadsCommand({ Bucket }))
    const ours = (open.Uploads ?? []).filter(
        upload =>
            upload.Key &&
            upload.UploadId &&
            names.some(name => upload.Key?.endsWith(name)),
    )
    await Promise.all(
        ours.map(upload =>
            client
                .send(
                    new AbortMultipartUploadCommand({
                        Bucket,
                        Key: upload.Key as string,
                        UploadId: upload.UploadId as string,
                    }),
                )
                .catch(() => {
                    // upup-catch: best-effort hygiene — never fail a green run on it.
                }),
        ),
    )
}

// ── Traffic observation (counting only — no request is answered from here) ──
type Traffic = {
    signedParts: number[]
    storedParts: number[]
    initCalls: number
    resumeCalls: number
    abortCalls: number
    completedKeys: Promise<string | undefined>[]
}

function partNumberOfSignRequest(body: string | null): number | undefined {
    if (!body) return undefined
    try {
        const parsed = JSON.parse(body) as { partNumber?: number }
        return parsed.partNumber
    } catch {
        // upup-catch: a body we cannot parse is a body we cannot attribute.
        return undefined
    }
}

function partNumberOfPutUrl(url: string): number | undefined {
    const raw = new URL(url).searchParams.get('partNumber')
    return raw ? Number(raw) : undefined
}

function watchTraffic(page: Page): Traffic {
    const traffic: Traffic = {
        signedParts: [],
        storedParts: [],
        initCalls: 0,
        resumeCalls: 0,
        abortCalls: 0,
        completedKeys: [],
    }

    page.on('request', request => {
        if (request.method() !== 'POST') return
        const url = request.url()
        if (url.endsWith('/multipart/init')) traffic.initCalls++
        if (url.endsWith('/multipart/resume')) traffic.resumeCalls++
        if (url.endsWith('/multipart/abort')) traffic.abortCalls++
        if (url.endsWith('/multipart/sign-part')) {
            const partNumber = partNumberOfSignRequest(request.postData())
            if (partNumber !== undefined) traffic.signedParts.push(partNumber)
        }
    })

    page.on('response', response => {
        const request = response.request()
        if (request.method() === 'PUT' && response.ok()) {
            const partNumber = partNumberOfPutUrl(response.url())
            if (partNumber !== undefined) traffic.storedParts.push(partNumber)
        }
        if (response.url().endsWith('/multipart/complete') && response.ok()) {
            traffic.completedKeys.push(
                response
                    .json()
                    .then((body: { key?: string }) => body.key)
                    .catch(() => undefined),
            )
        }
    })

    return traffic
}

/** Hold sign-part for every part but the first, so the crash lands with
 *  exactly one part stored. `release()` lets everything through again. */
async function holdPartsAfterTheFirst(
    page: Page,
): Promise<{ release: () => void }> {
    let holding = true
    const held: Route[] = []
    await page.route('**/multipart/sign-part', async route => {
        const partNumber = partNumberOfSignRequest(route.request().postData())
        if (holding && partNumber !== 1) {
            // Deliberately unanswered: these die with the reload, exactly as a
            // real crash kills in-flight requests.
            held.push(route)
            return
        }
        await route.continue().catch(() => {
            // upup-catch: the page may have navigated out from under the route.
        })
    })
    return {
        release: () => {
            holding = false
        },
    }
}

// ── Page-side session helpers (localStorage is the session store) ───────────
async function persistedSessionKeys(page: Page): Promise<string[]> {
    return page.evaluate(() =>
        Object.keys(localStorage).filter(key => key.startsWith('upup_mp_')),
    )
}

async function persistedUploadedBytes(page: Page): Promise<number | null> {
    return page.evaluate(() => {
        const key = Object.keys(localStorage).find(k =>
            k.startsWith('upup_mp_'),
        )
        if (!key) return null
        const raw = localStorage.getItem(key)
        if (!raw) return null
        return (
            (JSON.parse(raw) as { uploadedBytes?: number }).uploadedBytes ?? 0
        )
    })
}

// ── Fixtures ────────────────────────────────────────────────────────────────
test.beforeAll(async () => {
    if (!minioReady) return

    const minioHealth = `${requireEnv('UPUP_E2E_ENDPOINT')}/minio/health/live`
    expect(
        await reachable(minioHealth),
        `MinIO is configured but unreachable at ${minioHealth} — run \`pnpm run e2e:minio:up\``,
    ).toBe(true)

    harness = spawn('node', ['scripts/upup-e2e-server.mjs'], {
        cwd: REPO_ROOT,
        env: {
            ...process.env,
            UPUP_E2E_SERVER_PORT: String(HARNESS_PORT),
            UPUP_E2E_STORYBOOK_ORIGIN: APP_ORIGIN,
        },
        stdio: 'inherit',
    })

    await expect
        .poll(() => reachable(`${HARNESS_URL}/healthz`), {
            timeout: 60_000,
            message: `presign harness never bound ${HARNESS_URL} — is @upupjs/server built?`,
        })
        .toBe(true)

    fixtureDir = mkdtempSync(join(tmpdir(), 'upup-resume-e2e-'))
})

test.afterAll(async () => {
    if (minioReady && fixtureNames.length > 0) {
        await abortStrandedUploads(fixtureNames)
    }
    harness?.kill()
    harness = null
    if (fixtureDir) rmSync(fixtureDir, { recursive: true, force: true })
})

/** A private copy of the deterministic bytes per test — distinct names keep
 *  the fingerprints (name:size:lastModified:type) from colliding. */
function writeFixture(name: string): string {
    const path = join(fixtureDir, name)
    writeFileSync(path, SOURCE_BYTES)
    fixtureNames.push(name)
    return path
}

test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto(
        `/?scenario=multipart-resume&server=${encodeURIComponent(HARNESS_URL)}`,
    )
    await clearCrashRecovery(page)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
})

/**
 * Add the file, start the upload, and stop the world the moment part 1 is
 * stored: the page reloads with in-flight requests still open, which is what a
 * closed tab or a crashed browser does.
 */
async function crashAfterFirstPart(
    page: Page,
    filePath: string,
    traffic: Traffic,
): Promise<void> {
    const hold = await holdPartsAfterTheFirst(page)
    const firstPartStored = page.waitForResponse(
        response =>
            response.request().method() === 'PUT' &&
            partNumberOfPutUrl(response.url()) === 1 &&
            response.ok(),
        { timeout: 60_000 },
    )
    await page.setInputFiles('[data-testid="upup-file-input"]', filePath)
    await page.locator('[data-testid="upup-upload-btn"]').click()
    await firstPartStored

    await expect
        .poll(() => traffic.storedParts, {
            message: 'exactly one part is stored before the crash',
        })
        .toEqual([1])
    expect(traffic.initCalls, 'one multipart init before the crash').toBe(1)
    await expect
        .poll(() => persistedUploadedBytes(page), {
            message: 'the session records the bytes already banked',
        })
        .toBe(PART_SIZE)

    hold.release()
    await page.reload()
}

test.describe('server-mode multipart uploads across a page reload (real MinIO)', () => {
    test.skip(!minioReady, 'MinIO env absent — see the skip notice above')

    test('a page reload mid-upload is survivable: the restored file resumes from the stored part and the object lands byte-identical', async ({
        page,
    }) => {
        const traffic = watchTraffic(page)
        const filePath = writeFixture('cross-reload-resume-16mib.bin')

        await crashAfterFirstPart(page, filePath, traffic)
        const signedBeforeReload = [...traffic.signedParts]
        const storedBeforeReload = new Set(traffic.storedParts)

        // Crash recovery brings the file back, paused, with its session intact.
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute(
            'data-state',
            'paused',
            { timeout: 30_000 },
        )
        expect(await persistedSessionKeys(page)).toHaveLength(1)

        const resumeCallsBefore = traffic.resumeCalls
        const signedCountBeforeResume = traffic.signedParts.length
        await page.locator('[data-testid="upup-upload-resume"]').click()

        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute(
            'data-state',
            'successful',
            { timeout: 90_000 },
        )

        // (a) The resume handshake happened exactly once.
        expect(
            traffic.resumeCalls - resumeCallsBefore,
            'exactly one POST /multipart/resume',
        ).toBe(1)

        // (b) Work already banked is never redone: the part stored before the
        //     reload is not signed again after it.
        const signedAfterReload = traffic.signedParts.slice(
            signedCountBeforeResume,
        )
        expect(
            signedAfterReload.filter(part => storedBeforeReload.has(part)),
            'parts stored before the reload must not be re-signed after it',
        ).toEqual([])
        const remainingParts = Array.from(
            { length: TOTAL_PARTS - 1 },
            (_, i) => i + 2,
        )
        expect(signedAfterReload.sort((a, b) => a - b)).toEqual(remainingParts)
        expect(
            traffic.initCalls,
            'resume re-attaches instead of re-initiating',
        ).toBe(1)
        expect(signedBeforeReload).toContain(1)

        // (c) Every byte is where it should be.
        const keys = (await Promise.all(traffic.completedKeys)).filter(Boolean)
        expect(keys).toHaveLength(1)
        const stored = await storedObject(keys[0] as string)
        expect(stored.size).toBe(FILE_SIZE)
        expect(
            stored.sha256,
            'stored object is byte-identical to the source',
        ).toBe(SOURCE_SHA256)

        // The session is cleaned up once the upload is genuinely done.
        expect(await persistedSessionKeys(page)).toEqual([])
    })

    test('a persisted session the server will not honour degrades to a fresh upload instead of an error', async ({
        page,
    }) => {
        const traffic = watchTraffic(page)
        const filePath = writeFixture('cross-reload-stale-session-16mib.bin')

        await crashAfterFirstPart(page, filePath, traffic)
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute(
            'data-state',
            'paused',
            { timeout: 30_000 },
        )

        // Poison the stored token: same fingerprint, a token the server's HMAC
        // check will reject. Everything else about the session stays real.
        await page.evaluate(() => {
            for (const key of Object.keys(localStorage)) {
                if (!key.startsWith('upup_mp_')) continue
                const raw = localStorage.getItem(key)
                if (!raw) continue
                const session = JSON.parse(raw) as { token: string }
                session.token = 'stale-token-the-server-never-issued'
                localStorage.setItem(key, JSON.stringify(session))
            }
        })

        const resumeCallsBefore = traffic.resumeCalls
        const initCallsBefore = traffic.initCalls
        await page.locator('[data-testid="upup-upload-resume"]').click()

        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute(
            'data-state',
            'successful',
            { timeout: 90_000 },
        )
        expect(
            traffic.resumeCalls - resumeCallsBefore,
            'the client tries the stale session exactly once',
        ).toBe(1)
        expect(
            traffic.initCalls - initCallsBefore,
            'the rejected session falls back to one fresh multipart init',
        ).toBe(1)
        await expect(
            page.locator('[data-testid="upup-upload-error"]'),
        ).toHaveCount(0)

        const keys = (await Promise.all(traffic.completedKeys)).filter(Boolean)
        expect(keys).toHaveLength(1)
        const stored = await storedObject(keys[0] as string)
        expect(stored.size).toBe(FILE_SIZE)
        expect(stored.sha256, 'the fresh upload is byte-identical too').toBe(
            SOURCE_SHA256,
        )
        expect(await persistedSessionKeys(page)).toEqual([])
    })

    test('discarding the restored file aborts the server-side upload and drops its persisted session', async ({
        page,
    }) => {
        const traffic = watchTraffic(page)
        const filePath = writeFixture('cross-reload-discard-16mib.bin')

        await crashAfterFirstPart(page, filePath, traffic)
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute(
            'data-state',
            'paused',
            { timeout: 30_000 },
        )
        expect(await persistedSessionKeys(page)).toHaveLength(1)

        const abortRequested = page.waitForRequest(
            request =>
                request.method() === 'POST' &&
                request.url().endsWith('/multipart/abort'),
            { timeout: 30_000 },
        )
        await page.locator('[data-testid="upup-file-remove"]').first().click()
        await abortRequested

        expect(
            traffic.abortCalls,
            'the discarded upload is aborted server-side',
        ).toBe(1)
        await expect
            .poll(() => persistedSessionKeys(page), {
                message: 'discarding a file clears its persisted session',
            })
            .toEqual([])
    })
})
