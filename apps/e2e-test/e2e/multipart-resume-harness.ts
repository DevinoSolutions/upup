// Shared machinery for the real-MinIO multipart crash/resume specs.
//
// Extracted verbatim from multipart-cross-reload-resume.spec.ts when a second
// spec (multipart-crash-restore-regressions.spec.ts) needed the same env gate,
// presign harness, MinIO reader, traffic observer and session helpers. Nothing
// here fakes the transport: the harness is the repo's own express presign
// server (scripts/upup-e2e-server.mjs) talking to a REAL MinIO, and the traffic
// observer only counts requests — it never answers one.
//
// Gating mirrors the drive-sandbox suite: MinIO env present -> run; absent ->
// skip GREEN with a loud notice (so `pnpm run e2e`, which drives this suite
// without the dotenv wrapper, stays green); env present but MinIO or the
// harness unreachable -> RED.

import { expect, type Page, type Route } from '@playwright/test'
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

// ── Env gating ──────────────────────────────────────────────────────────────
const MINIO_ENV = [
    'UPUP_E2E_BUCKET',
    'UPUP_E2E_REGION',
    'UPUP_E2E_ENDPOINT',
    'MINIO_ROOT_USER',
    'MINIO_ROOT_PASSWORD',
] as const

export const minioReady = MINIO_ENV.every(key => Boolean(process.env[key]))

/** Loud, single-line skip notice — the run still exits 0 (all tests skip). */
export function announceMinioSkip(suite: string): void {
    if (minioReady) return
    console.log(
        `[${suite}] SKIP (green): MinIO env missing (UPUP_E2E_*/MINIO_ROOT_*). ` +
            'Run through `dotenv -e local-dev/.env.minio` with MinIO up on :9100.',
    )
}

function requireEnv(name: string): string {
    const value = process.env[name]
    if (!value) throw new Error(`missing env ${name}`)
    return value
}

// ── Deterministic bytes so every fixture's sha256 is a fixed fact ────────────
export const PART_SIZE = 5 * 1024 * 1024

/** xorshift32 fill — incompressible-ish, reproducible, and cheap. */
export function seededBytes(size: number, seed: number): Buffer {
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

export function sha256(bytes: Buffer): string {
    return createHash('sha256').update(bytes).digest('hex')
}

// ── Harness process (the repo's express presign server) ─────────────────────
const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..', '..', '..') // e2e -> e2e-test -> apps -> root

/** The vite app the react e2e suite serves (playwright.config.ts baseURL). */
const APP_ORIGIN = 'http://localhost:3333'

async function reachable(url: string): Promise<boolean> {
    try {
        const res = await fetch(url)
        return res.ok
    } catch {
        // upup-catch: "not up yet" is the expected answer while polling.
        return false
    }
}

export interface PresignHarness {
    url: string
    stop: () => void
}

/**
 * Boot the repo's presign server on `port` with the vite app's origin allowed.
 * Deliberately NOT :53060 — the cross-framework gate's harness owns that port
 * and allows only the six storybook origins, so reusing it would 403 the app.
 * Each real-MinIO spec file owns its own port so two files can never contend.
 */
export async function startPresignHarness(
    port: number,
): Promise<PresignHarness> {
    const url = `http://localhost:${port}`
    const minioHealth = `${requireEnv('UPUP_E2E_ENDPOINT')}/minio/health/live`
    expect(
        await reachable(minioHealth),
        `MinIO is configured but unreachable at ${minioHealth} — run \`pnpm run e2e:minio:up\``,
    ).toBe(true)

    let child: ChildProcess | null = spawn(
        'node',
        ['scripts/upup-e2e-server.mjs'],
        {
            cwd: REPO_ROOT,
            env: {
                ...process.env,
                UPUP_E2E_SERVER_PORT: String(port),
                UPUP_E2E_STORYBOOK_ORIGIN: APP_ORIGIN,
            },
            stdio: 'inherit',
        },
    )

    await expect
        .poll(() => reachable(`${url}/healthz`), {
            timeout: 60_000,
            message: `presign harness never bound ${url} — is @useupup/server built?`,
        })
        .toBe(true)

    return {
        url,
        stop: () => {
            child?.kill()
            child = null
        },
    }
}

// ── Fixtures on disk ────────────────────────────────────────────────────────
export interface FixtureDir {
    /** Write `bytes` to a private file and return its path. Distinct names keep
     *  the fingerprints (name:size:lastModified:type) from colliding. */
    write: (name: string, bytes: Buffer) => string
    /** Every name written so far — the abort-stranded-uploads reaper's input. */
    names: string[]
    cleanup: () => void
}

export function createFixtureDir(prefix: string): FixtureDir {
    const dir = mkdtempSync(join(tmpdir(), prefix))
    const names: string[] = []
    return {
        write: (name, bytes) => {
            const path = join(dir, name)
            writeFileSync(path, bytes)
            names.push(name)
            return path
        },
        names,
        cleanup: () => {
            rmSync(dir, { recursive: true, force: true })
        },
    }
}

// ── MinIO reads ─────────────────────────────────────────────────────────────
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
export async function storedObject(key: string): Promise<{
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
    return { sha256: sha256(bytes), size: bytes.length }
}

/**
 * Reap the multipart uploads these suites deliberately strand. `persist` mode's
 * whole point is that an interrupted upload survives — so a stale-session test
 * leaves a server-side upload nothing will ever finish (the documented tradeoff
 * an `AbortIncompleteMultipartUpload` lifecycle rule covers in production). The
 * shared dev bucket has no such rule, so the suites clean up after themselves
 * instead of growing orphans per run.
 */
export async function abortStrandedUploads(names: string[]): Promise<void> {
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
export type Traffic = {
    signedParts: number[]
    storedParts: number[]
    /** Every successful part PUT as `{ key, partNumber }`, so a multi-file run
     *  can prove no file's parts landed in another file's object. */
    storedPartsByKey: { key: string; partNumber: number }[]
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

export function partNumberOfPutUrl(url: string): number | undefined {
    const raw = new URL(url).searchParams.get('partNumber')
    return raw ? Number(raw) : undefined
}

/** The object key a presigned part PUT targets — the URL path minus the bucket
 *  segment (the harness signs path-style against MinIO). */
function keyOfPutUrl(url: string): string {
    const segments = new URL(url).pathname.split('/').filter(Boolean)
    return segments.slice(1).join('/')
}

export function watchTraffic(page: Page): Traffic {
    const traffic: Traffic = {
        signedParts: [],
        storedParts: [],
        storedPartsByKey: [],
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
            if (partNumber !== undefined) {
                traffic.storedParts.push(partNumber)
                traffic.storedPartsByKey.push({
                    key: keyOfPutUrl(response.url()),
                    partNumber,
                })
            }
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
 *  exactly one part stored per file. `release()` lets everything through
 *  again. */
export async function holdPartsAfterTheFirst(
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
export async function persistedSessionKeys(page: Page): Promise<string[]> {
    return page.evaluate(() =>
        Object.keys(localStorage).filter(key => key.startsWith('upup_mp_')),
    )
}

export async function persistedUploadedBytes(
    page: Page,
): Promise<number | null> {
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

/** `uploadedBytes` per persisted session, keyed by the session's file name (the
 *  first field of the `upup_mp_<name>:<size>:<lastModified>:<type>` key). */
export async function persistedUploadedBytesByFileName(
    page: Page,
): Promise<Record<string, number>> {
    return page.evaluate(() => {
        const out: Record<string, number> = {}
        for (const key of Object.keys(localStorage)) {
            if (!key.startsWith('upup_mp_')) continue
            const raw = localStorage.getItem(key)
            if (!raw) continue
            const name = key.slice('upup_mp_'.length).split(':')[0] ?? key
            out[name] =
                (JSON.parse(raw) as { uploadedBytes?: number }).uploadedBytes ??
                0
        }
        return out
    })
}
