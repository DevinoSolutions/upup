// The crash-restore behaviours the single-file cross-reload proof does not
// cover, each pinned against a REAL @useupup/server + a REAL MinIO bucket:
//
//   1. THREE files crash together and all three come back — each at ITS OWN
//      restored byte offset — and resuming finishes every one of them into an
//      object that is byte-identical to its own source (no file's parts leak
//      into another file's object).
//   2. An upload that COMPLETED and then lost the async IndexedDB snapshot
//      clear to page death must NOT come back as a resumable file. Proven
//      twice: once from the hand-seeded stale state (deterministic), and once
//      from a real completed upload whose snapshot clear is suppressed, so the
//      stale state is proven REACHABLE and not merely hypothetical.
//   3. A crash-restored PAUSED file carrying seeded progress stays REMOVABLE —
//      the one path that aborts its server-side upload and drops its persisted
//      session. Seeded progress used to read as "in flight" and disable it.
//
// Transport shaping is the same single lever the sibling spec uses:
// `/multipart/sign-part` for parts after the first is HELD (never answered)
// until the reload, so "crash with exactly one part banked per file" is
// deterministic instead of a race against a localhost MinIO. Held requests die
// with the reload exactly the way a real crash kills in-flight requests; every
// other byte on the wire is real.
//
// Gating mirrors the sibling spec: MinIO env present -> run; absent -> skip
// GREEN with a loud notice; env present but MinIO/harness unreachable -> RED.
//
// Run:
//   pnpm exec dotenv -e local-dev/.env.minio -- \
//     pnpm --filter @useupup/e2e-test exec playwright test multipart-crash-restore-regressions
// Requires: `pnpm --filter @useupup/server build` and MinIO up on :9100.

import { test, expect, type Locator, type Page } from '@playwright/test'
import { clearCrashRecovery } from './helpers'
import {
    abortStrandedUploads,
    announceMinioSkip,
    createFixtureDir,
    holdPartsAfterTheFirst,
    minioReady,
    PART_SIZE,
    persistedSessionKeys,
    persistedUploadedBytesByFileName,
    seededBytes,
    sha256,
    startPresignHarness,
    storedObject,
    watchTraffic,
    type FixtureDir,
    type PresignHarness,
    type Traffic,
} from './multipart-resume-harness'

announceMinioSkip('multipart-crash-restore-e2e')

// Its own port: the sibling spec owns 53061, and two spec files must never
// contend for one harness even when Playwright raises the worker count.
const HARNESS_PORT = Number(
    process.env.UPUP_E2E_CRASH_RESTORE_SERVER_PORT ?? 53062,
)
const HARNESS_URL = `http://localhost:${HARNESS_PORT}`
const SCENARIO = `/?scenario=multipart-resume&server=${encodeURIComponent(HARNESS_URL)}`

/**
 * Three DELIBERATELY DIFFERENT sizes. Same-sized files would make "each shows
 * its own restored offset" unfalsifiable — after one 5 MiB part they would all
 * read the same percentage, so a swapped offset would look correct. These
 * three land on 45% / 31% / 23%, which only match if each file kept its own.
 */
const MULTI_FILE_PLAN = [
    { name: 'multi-resume-a-11mib.bin', size: 11 * 1024 * 1024, seed: 0xa11ce },
    { name: 'multi-resume-b-16mib.bin', size: 16 * 1024 * 1024, seed: 0xb0b1e },
    {
        name: 'multi-resume-c-21mib.bin',
        size: 21 * 1024 * 1024,
        seed: 0xc0ffee,
    },
].map(entry => ({
    ...entry,
    parts: Math.ceil(entry.size / PART_SIZE),
    restoredPercent: Math.floor((PART_SIZE / entry.size) * 100),
    bytes: minioReady ? seededBytes(entry.size, entry.seed) : Buffer.alloc(0),
}))

/** Single 11 MiB file (3 parts) for the completion-race + removal proofs. */
const SINGLE_FILE_SIZE = 11 * 1024 * 1024
const SINGLE_FILE_BYTES = minioReady
    ? seededBytes(SINGLE_FILE_SIZE, 0x5eed17)
    : Buffer.alloc(0)

let harness: PresignHarness | null = null
let fixtures: FixtureDir | null = null

test.beforeAll(async () => {
    if (!minioReady) return
    harness = await startPresignHarness(HARNESS_PORT)
    fixtures = createFixtureDir('upup-crash-restore-e2e-')
})

test.afterAll(async () => {
    if (minioReady && fixtures && fixtures.names.length > 0) {
        await abortStrandedUploads(fixtures.names)
    }
    harness?.stop()
    harness = null
    fixtures?.cleanup()
    fixtures = null
})

function writeFixture(name: string, bytes: Buffer): string {
    if (!fixtures) throw new Error('fixture dir not created')
    return fixtures.write(name, bytes)
}

test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000)
    await page.goto(SCENARIO)
    await clearCrashRecovery(page)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
})

// ── Crash-recovery snapshot, read/written from the page ─────────────────────
type SnapshotView = {
    status: string | null
    files: { name: string | null; status: string | null; key: string | null }[]
} | null

const CRASH_DB = 'upup-crash-recovery'
const CRASH_STORE = 'upup-store'

/** The persisted snapshot, flattened to plain fields (the raw entry holds a
 *  File, which cannot cross the page boundary). */
async function crashSnapshot(page: Page): Promise<SnapshotView> {
    return page.evaluate(
        ([dbName, storeName]) =>
            new Promise<SnapshotView>(resolve => {
                const open = indexedDB.open(dbName, 1)
                open.onupgradeneeded = () => {
                    if (!open.result.objectStoreNames.contains(storeName)) {
                        open.result.createObjectStore(storeName)
                    }
                }
                open.onerror = () => resolve(null)
                open.onsuccess = () => {
                    const db = open.result
                    const tx = db.transaction(storeName, 'readonly')
                    const request = tx.objectStore(storeName).get(dbName)
                    request.onsuccess = () => {
                        const value = request.result as
                            | {
                                  status?: string
                                  files?: [
                                      string,
                                      {
                                          name?: string
                                          status?: string
                                          key?: string
                                      },
                                  ][]
                              }
                            | undefined
                        resolve(
                            value
                                ? {
                                      status: value.status ?? null,
                                      files: (value.files ?? []).map(entry => ({
                                          name: entry[1]?.name ?? null,
                                          status: entry[1]?.status ?? null,
                                          key: entry[1]?.key ?? null,
                                      })),
                                  }
                                : null,
                        )
                    }
                    request.onerror = () => resolve(null)
                    tx.oncomplete = () => {
                        db.close()
                    }
                }
            }),
        [CRASH_DB, CRASH_STORE] as const,
    )
}

/**
 * Write the EXACT state the completion race leaves behind: an UPLOADING-status
 * multipart-sized file with no `key`, and (because the caller cleared
 * localStorage) no persisted multipart session. Completion removes the session
 * synchronously; only the IndexedDB clear is async, so "snapshot present,
 * session gone" is precisely the window page death opens.
 */
async function seedStaleCompletedSnapshot(
    page: Page,
    name: string,
    size: number,
): Promise<void> {
    await page.evaluate(
        ([dbName, storeName, fileName, byteLength]) =>
            new Promise<void>((resolve, reject) => {
                const lastModified = 1_700_000_000_000
                const file = new File(
                    [new Uint8Array(byteLength as number)],
                    fileName as string,
                    { type: 'video/mp4', lastModified },
                )
                const snapshot = {
                    files: [
                        [
                            'stale-completion-1',
                            {
                                file,
                                id: 'stale-completion-1',
                                name: fileName,
                                type: 'video/mp4',
                                lastModified,
                                source: 'local',
                                status: 'UPLOADING',
                                metadata: {},
                            },
                        ],
                    ],
                    status: 'UPLOADING',
                }
                const open = indexedDB.open(dbName as string, 1)
                open.onupgradeneeded = () => {
                    if (
                        !open.result.objectStoreNames.contains(
                            storeName as string,
                        )
                    ) {
                        open.result.createObjectStore(storeName as string)
                    }
                }
                open.onerror = () => reject(open.error)
                open.onsuccess = () => {
                    const db = open.result
                    const tx = db.transaction(storeName as string, 'readwrite')
                    tx.objectStore(storeName as string).put(
                        snapshot,
                        dbName as string,
                    )
                    tx.oncomplete = () => {
                        db.close()
                        resolve()
                    }
                    tx.onerror = () => {
                        db.close()
                        reject(tx.error)
                    }
                }
            }),
        [CRASH_DB, CRASH_STORE, name, size] as const,
    )
}

// ── DOM helpers ─────────────────────────────────────────────────────────────
function fileCard(page: Page, name: string): Locator {
    return page
        .locator('[data-testid="upup-file-item"]')
        .filter({ hasText: name })
}

function anyFileSurface(page: Page): Locator {
    return page.locator(
        '[data-testid="upup-file-item"], [data-testid="upup-file-hero"]',
    )
}

/**
 * Add every file, start the upload, and stop the world once EACH file has
 * banked exactly its first part: the page reloads with in-flight requests still
 * open, which is what a closed tab or a crashed browser does.
 */
async function crashAfterFirstPartOfEvery(
    page: Page,
    filePaths: string[],
    traffic: Traffic,
): Promise<void> {
    const hold = await holdPartsAfterTheFirst(page)
    await page.setInputFiles('[data-testid="upup-file-input"]', filePaths)
    await page.locator('[data-testid="upup-upload-btn"]').click()

    await expect
        .poll(() => [...traffic.storedParts].sort((a, b) => a - b), {
            message: 'every file banks exactly its first part before the crash',
            timeout: 90_000,
        })
        .toEqual(filePaths.map(() => 1))
    expect(
        traffic.initCalls,
        'one multipart init per file before the crash',
    ).toBe(filePaths.length)

    hold.release()
    await page.reload()
}

test.describe('crash-restore regressions for server-mode multipart uploads (real MinIO)', () => {
    test.skip(!minioReady, 'MinIO env absent — see the skip notice above')

    test('three files crashed mid-flight all come back, each at its own restored byte offset, and resuming lands three byte-identical objects with no parts crossing between them', async ({
        page,
    }) => {
        const traffic = watchTraffic(page)
        const paths = MULTI_FILE_PLAN.map(file =>
            writeFixture(file.name, file.bytes),
        )

        // maxFiles=3 is the only scenario knob this test needs; the sibling
        // single-file spec keeps the default of 1.
        await page.goto(`${SCENARIO}&maxFiles=3`)
        await crashAfterFirstPartOfEvery(page, paths, traffic)

        // (a) All three files come back, paused, each with its own session.
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute(
            'data-state',
            'paused',
            { timeout: 30_000 },
        )
        await expect(anyFileSurface(page)).toHaveCount(MULTI_FILE_PLAN.length)
        for (const file of MULTI_FILE_PLAN) {
            await expect(
                fileCard(page, file.name),
                `${file.name} is restored`,
            ).toHaveCount(1)
        }
        await expect
            .poll(() => persistedUploadedBytesByFileName(page), {
                message: 'each file keeps its own session at one banked part',
            })
            .toEqual(
                Object.fromEntries(
                    MULTI_FILE_PLAN.map(file => [file.name, PART_SIZE]),
                ),
            )

        // (b) Each restored file displays ITS OWN offset. The three sizes
        //     differ, so these three percentages are only simultaneously true
        //     if no file inherited another's byte count.
        for (const file of MULTI_FILE_PLAN) {
            await expect(
                fileCard(page, file.name).locator(
                    '[data-testid="upup-progress-bar"]',
                ),
                `${file.name} reopens at its own restored offset`,
            ).toHaveAttribute('aria-valuenow', String(file.restoredPercent), {
                timeout: 30_000,
            })
        }

        // (c) Resuming finishes ALL of them.
        await page.locator('[data-testid="upup-upload-resume"]').click()
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute(
            'data-state',
            'successful',
            { timeout: 150_000 },
        )
        expect(
            traffic.resumeCalls,
            'one resume handshake per crashed file',
        ).toBe(MULTI_FILE_PLAN.length)
        expect(
            traffic.initCalls,
            'resume re-attaches instead of re-initiating',
        ).toBe(MULTI_FILE_PLAN.length)

        // (d) Every object is byte-identical to ITS OWN source.
        const keys = (await Promise.all(traffic.completedKeys)).filter(
            (key): key is string => Boolean(key),
        )
        expect(keys).toHaveLength(MULTI_FILE_PLAN.length)
        for (const file of MULTI_FILE_PLAN) {
            const key = keys.find(candidate => candidate.endsWith(file.name))
            expect(
                key,
                `${file.name} completed into its own object`,
            ).toBeTruthy()
            const stored = await storedObject(key as string)
            expect(stored.size, `${file.name} landed whole`).toBe(file.size)
            expect(
                stored.sha256,
                `${file.name} is byte-identical to its own source`,
            ).toBe(sha256(file.bytes))
        }

        // (e) No file's parts were written into another file's object: every
        //     part PUT that targeted a given key belongs to that key's file,
        //     and each part landed exactly once.
        for (const file of MULTI_FILE_PLAN) {
            const key = keys.find(candidate => candidate.endsWith(file.name))
            const parts = traffic.storedPartsByKey
                .filter(entry => entry.key === key)
                .map(entry => entry.partNumber)
                .sort((a, b) => a - b)
            expect(
                parts,
                `${file.name} received exactly its own ${file.parts} parts, once each`,
            ).toEqual(
                Array.from({ length: file.parts }, (_, index) => index + 1),
            )
        }
        expect(
            traffic.storedPartsByKey.filter(
                entry => !keys.some(key => entry.key === key),
            ),
            'every stored part belongs to one of the three completed objects',
        ).toEqual([])

        expect(await persistedSessionKeys(page)).toEqual([])
    })

    test('a snapshot left behind by an upload that finished before its async clear landed restores to an empty dropzone instead of a bogus resumable file', async ({
        page,
    }) => {
        // The exact residue of the completion race: an UPLOADING-status,
        // multipart-sized file in the snapshot with NO persisted session
        // (completion removes the session synchronously; only the IndexedDB
        // clear is async, and page death can beat it).
        //
        // Seeding retries because the fixture's `deleteDatabase` resolves on
        // `onblocked` too: a delete that was blocked by the mounted uploader's
        // connection can land AFTER the first write and wipe it. Re-seeding
        // until the read-back agrees makes the SETUP deterministic; the
        // contract being tested is everything below the navigation.
        await expect
            .poll(
                async () => {
                    await seedStaleCompletedSnapshot(
                        page,
                        'stale-completion-race-6mib.mp4',
                        6 * 1024 * 1024,
                    )
                    return (await crashSnapshot(page))?.files
                },
                {
                    message: 'the stale snapshot is in place before the visit',
                    timeout: 30_000,
                },
            )
            .toEqual([
                {
                    name: 'stale-completion-race-6mib.mp4',
                    status: 'UPLOADING',
                    key: null,
                },
            ])
        expect(
            await persistedSessionKeys(page),
            'the stale state has no multipart session — that is what makes it stale',
        ).toEqual([])

        await page.goto(SCENARIO)

        // The uploader opens EMPTY: no file surface, nothing to resume.
        await expect(
            page.locator('[data-testid="upup-dropzone"]'),
        ).toBeVisible()
        await expect(
            anyFileSurface(page),
            'a finished upload must not resurrect as a restorable file',
        ).toHaveCount(0)
        await expect(
            page.locator('[data-testid="upup-upload-resume"]'),
        ).toHaveCount(0)

        // ...and the stale snapshot is cleared rather than left to re-offer
        // itself on the next visit.
        await expect
            .poll(() => crashSnapshot(page), {
                message:
                    'the stale snapshot is cleared on the visit that rejects it',
                timeout: 30_000,
            })
            .toBeNull()
    })

    test('a real upload that completes at the instant its crash-recovery writes stop reaching disk leaves exactly that stale residue, and the next visit still opens on an empty dropzone', async ({
        page,
    }) => {
        const traffic = watchTraffic(page)
        const path = writeFixture(
            'completion-race-11mib.bin',
            SINGLE_FILE_BYTES,
        )

        // Simulate page death in the exact window the bug lives in: from the
        // moment the /multipart/complete request leaves the page, NOTHING the
        // crash-recovery store writes reaches disk again — neither the
        // post-completion snapshot nor the clear that should follow it. The
        // synchronous localStorage session removal is untouched, because that
        // one really does land before the page dies. The patch is keyed on a
        // URL flag so the follow-up visit runs with unmodified IndexedDB.
        await page.addInitScript(() => {
            if (!location.search.includes('upupFreezeSnapshotOnComplete=1')) {
                return
            }
            const state = { frozen: false }
            const isComplete = (url: string) =>
                url.includes('/multipart/complete')

            const realFetch = window.fetch.bind(window)
            window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
                const url =
                    typeof input === 'string'
                        ? input
                        : input instanceof URL
                          ? input.href
                          : input.url
                if (isComplete(url)) state.frozen = true
                return realFetch(input, init)
            }
            const realOpen = XMLHttpRequest.prototype.open
            XMLHttpRequest.prototype.open = function (
                this: XMLHttpRequest,
                method: string,
                url: string | URL,
                ...rest: unknown[]
            ) {
                if (isComplete(String(url))) state.frozen = true
                return (
                    realOpen as unknown as (
                        this: XMLHttpRequest,
                        ...args: unknown[]
                    ) => void
                ).call(this, method, url, ...rest)
            } as typeof XMLHttpRequest.prototype.open

            // Frozen writes resolve exactly like real ones and change nothing:
            // the page is gone, the disk never hears about it.
            const realPut = IDBObjectStore.prototype.put
            IDBObjectStore.prototype.put = function (
                this: IDBObjectStore,
                value: unknown,
                key?: IDBValidKey,
            ): IDBRequest<IDBValidKey> {
                if (state.frozen && this.name === 'upup-store') {
                    return this.get(
                        key as IDBValidKey,
                    ) as unknown as IDBRequest<IDBValidKey>
                }
                return realPut.call(this, value, key)
            }
            const realDelete = IDBObjectStore.prototype.delete
            IDBObjectStore.prototype.delete = function (
                this: IDBObjectStore,
                query: IDBValidKey | IDBKeyRange,
            ): IDBRequest<undefined> {
                if (state.frozen && this.name === 'upup-store') {
                    return this.get(query) as unknown as IDBRequest<undefined>
                }
                return realDelete.call(this, query)
            }
        })
        await page.goto(`${SCENARIO}&upupFreezeSnapshotOnComplete=1`)

        await page.setInputFiles('[data-testid="upup-file-input"]', path)
        await page.locator('[data-testid="upup-upload-btn"]').click()
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute(
            'data-state',
            'successful',
            { timeout: 150_000 },
        )

        // The upload genuinely finished against MinIO.
        const keys = (await Promise.all(traffic.completedKeys)).filter(Boolean)
        expect(keys).toHaveLength(1)
        const stored = await storedObject(keys[0] as string)
        expect(stored.size).toBe(SINGLE_FILE_SIZE)
        expect(stored.sha256).toBe(sha256(SINGLE_FILE_BYTES))

        // Completion removed the session synchronously; the suppressed clear
        // left the mid-flight snapshot as the last word. That pair IS the bug's
        // residue — proof the hand-seeded state above is reachable, not
        // hypothetical.
        await expect
            .poll(() => persistedSessionKeys(page), {
                message: 'completion drops the multipart session synchronously',
                timeout: 30_000,
            })
            .toEqual([])
        const residue = await crashSnapshot(page)
        expect(
            residue?.files.map(file => ({
                status: file.status,
                key: file.key,
            })),
            'the surviving snapshot is the mid-flight one: UPLOADING, no key — the same shape the hand-seeded proof above uses',
        ).toEqual([{ status: 'UPLOADING', key: null }])

        // A fresh visit (clear no longer suppressed) must open empty.
        await page.goto(SCENARIO)
        await expect(
            page.locator('[data-testid="upup-dropzone"]'),
        ).toBeVisible()
        await expect(
            anyFileSurface(page),
            'the finished upload must not be offered as resumable',
        ).toHaveCount(0)
        await expect(
            page.locator('[data-testid="upup-upload-resume"]'),
        ).toHaveCount(0)
    })

    test('a crash-restored paused file carrying seeded progress keeps its remove control enabled, and using it aborts the server-side upload', async ({
        page,
    }) => {
        const traffic = watchTraffic(page)
        const path = writeFixture(
            'paused-removable-11mib.bin',
            SINGLE_FILE_BYTES,
        )

        await crashAfterFirstPartOfEvery(page, [path], traffic)
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute(
            'data-state',
            'paused',
            { timeout: 30_000 },
        )

        // The precondition that used to break removal: the restored PAUSED file
        // carries real seeded progress, which "has progress ⇒ in flight" read as
        // a reason to lock the control.
        await expect(
            page.locator('[data-testid="upup-progress-bar"]').first(),
            'the restored paused file shows its seeded byte offset',
        ).toHaveAttribute(
            'aria-valuenow',
            String(Math.floor((PART_SIZE / SINGLE_FILE_SIZE) * 100)),
            { timeout: 30_000 },
        )
        expect(await persistedSessionKeys(page)).toHaveLength(1)

        const remove = page.locator('[data-testid="upup-file-remove"]').first()
        await expect(
            remove,
            'a paused file must stay discardable — it is the only path that aborts its server-side upload',
        ).toBeEnabled()

        const abortRequested = page.waitForRequest(
            request =>
                request.method() === 'POST' &&
                request.url().endsWith('/multipart/abort'),
            { timeout: 30_000 },
        )
        await remove.click()
        await abortRequested

        expect(
            traffic.abortCalls,
            'the discarded upload is aborted server-side',
        ).toBe(1)
        await expect
            .poll(() => persistedSessionKeys(page), {
                message: 'discarding a restored paused file clears its session',
            })
            .toEqual([])
        await expect(anyFileSurface(page)).toHaveCount(0)
    })
})
