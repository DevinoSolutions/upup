// One contract, all six frameworks: a crash-restored PAUSED file that carries a
// resumable byte offset must keep its remove control ENABLED.
//
// Why this needs its own harness instead of a parity fixture: parity.spec.ts
// compares normalized DOM subtrees against a canon fixture captured from react,
// and its stories are deliberately state-free (mount, then seed files through
// the input). A crash-restored file is not reachable that way — it only exists
// after the uploader reads a crash-recovery snapshot at mount. So each
// framework gets a `CrashRestore` story (crashRecovery + multipart resume, no
// network), this spec writes the snapshot AND the persisted multipart session
// before the story mounts, and every framework is then asserted on the same
// rendered contract. Playwright's project-per-framework wiring (the same one
// smoke.spec.ts uses) is what makes this run six times.
//
// The regression it pins: `isFileRemovalLocked(progress, status)` used to read
// "has progress" as "in flight". Seeding a restored paused file's byte offset
// into the progress pipeline therefore disabled its remove button — and remove
// is the ONE path that aborts the server-side upload and drops the persisted
// session, so a crashed upload became undiscardable.
//
// Run: pnpm --filter @useupup/e2e-test test:e2e:cf

import { test, expect, type Page } from '@playwright/test'
import { byName, storyUrl } from './framework-matrix'

// A tiny file with an exact, boring arithmetic relationship: 1024 of 4096 bytes
// banked is 25%, so the rendered offset is a fixed fact on every framework.
const FILE_NAME = 'crash-restored-paused.bin'
const FILE_TYPE = 'application/octet-stream'
const FILE_SIZE = 4096
const UPLOADED_BYTES = 1024
const LAST_MODIFIED = 1_700_000_000_000
const RESTORED_PERCENT = Math.floor((UPLOADED_BYTES / FILE_SIZE) * 100)

const CRASH_DB = 'upup-crash-recovery'
const CRASH_STORE = 'upup-store'

async function clearCrashRecovery(page: Page) {
    await page.evaluate(
        () =>
            new Promise<void>(resolve => {
                const req = indexedDB.deleteDatabase('upup-crash-recovery')
                req.onsuccess = () => resolve()
                req.onerror = () => resolve()
                req.onblocked = () => resolve()
            }),
    )
}

/**
 * Write the two halves of a genuinely crashed multipart upload:
 *   - the crash-recovery snapshot (one UPLOADING file, no key), which is what
 *     restore normalizes to PAUSED, and
 *   - the persisted multipart session, which is what `seedRestoredProgress`
 *     replays as the restored byte offset.
 *
 * `scope` is deliberately omitted: the CrashRestore story configures no
 * serverUrl, and the session scope gate compares the two — both undefined is a
 * match, which is exactly the no-network shape this story needs.
 */
async function seedCrashedMultipartUpload(page: Page): Promise<void> {
    await page.evaluate(
        async ({
            dbName,
            storeName,
            name,
            type,
            size,
            lastModified,
            uploadedBytes,
        }) => {
            const file = new File([new Uint8Array(size)], name, {
                type,
                lastModified,
            })
            const snapshot = {
                files: [
                    [
                        'crash-restored-1',
                        {
                            file,
                            id: 'crash-restored-1',
                            name,
                            type,
                            lastModified,
                            source: 'local',
                            status: 'UPLOADING',
                            metadata: {},
                        },
                    ],
                ],
                status: 'UPLOADING',
            }
            localStorage.setItem(
                `upup_mp_${name}:${size}:${lastModified}:${type}`,
                JSON.stringify({
                    token: 'crash-restore-session-token',
                    key: `uploads/${name}`,
                    partSize: uploadedBytes,
                    updatedAt: Date.now(),
                    uploadedBytes,
                }),
            )
            await new Promise<void>((resolve, reject) => {
                const open = indexedDB.open(dbName, 1)
                open.onupgradeneeded = () => {
                    if (!open.result.objectStoreNames.contains(storeName)) {
                        open.result.createObjectStore(storeName)
                    }
                }
                open.onerror = () => reject(open.error)
                open.onsuccess = () => {
                    const db = open.result
                    const tx = db.transaction(storeName, 'readwrite')
                    tx.objectStore(storeName).put(snapshot, dbName)
                    tx.oncomplete = () => {
                        db.close()
                        resolve()
                    }
                    tx.onerror = () => {
                        db.close()
                        reject(tx.error)
                    }
                }
            })
        },
        {
            dbName: CRASH_DB,
            storeName: CRASH_STORE,
            name: FILE_NAME,
            type: FILE_TYPE,
            size: FILE_SIZE,
            lastModified: LAST_MODIFIED,
            uploadedBytes: UPLOADED_BYTES,
        },
    )
}

/** How many files the persisted snapshot currently holds (-1 = no snapshot).
 *  Used only to confirm the seed actually landed before reloading. */
async function seededFileCount(page: Page): Promise<number> {
    return page.evaluate(
        ([dbName, storeName]) =>
            new Promise<number>(resolve => {
                const open = indexedDB.open(dbName, 1)
                open.onupgradeneeded = () => {
                    if (!open.result.objectStoreNames.contains(storeName)) {
                        open.result.createObjectStore(storeName)
                    }
                }
                open.onerror = () => resolve(-1)
                open.onblocked = () => resolve(-1)
                open.onsuccess = () => {
                    const db = open.result
                    const tx = db.transaction(storeName, 'readonly')
                    const request = tx.objectStore(storeName).get(dbName)
                    request.onsuccess = () => {
                        const value = request.result as
                            { files?: unknown[] } | undefined
                        resolve(value?.files?.length ?? -1)
                    }
                    request.onerror = () => resolve(-1)
                    tx.oncomplete = () => {
                        db.close()
                    }
                }
            }),
        [CRASH_DB, CRASH_STORE] as const,
    )
}

test.describe('cross-framework crash-restore removal contract', () => {
    test('a crash-restored paused file that carries a resumable byte offset keeps its remove control enabled, and using it discards the file', async ({
        page,
    }, testInfo) => {
        const fw = byName(testInfo.project.name)

        // Mount once to own the origin, wipe any prior state, seed the crashed
        // upload, then reload so the uploader restores from it.
        await page.goto(storyUrl(fw.crashRestoreStoryId))
        await expect(page.locator('[data-testid="upup-root"]')).toBeVisible({
            timeout: 30_000,
        })
        await clearCrashRecovery(page)
        await page.evaluate(() => localStorage.clear())
        // Seeding retries because `deleteDatabase` resolves on `onblocked`
        // too: a delete blocked by the mounted uploader's connection can land
        // AFTER the first write and wipe it. Re-seed until the read-back
        // agrees, so only the SETUP is retried — never an assertion.
        await expect
            .poll(
                async () => {
                    await seedCrashedMultipartUpload(page)
                    return seededFileCount(page)
                },
                {
                    message: `${fw.name}: the crashed upload is seeded before the visit`,
                    timeout: 30_000,
                },
            )
            .toBe(1)
        await page.reload()

        // 1. The crashed file comes back, paused.
        await expect(page.locator('[data-testid="upup-root"]')).toHaveAttribute(
            'data-state',
            'paused',
            { timeout: 30_000 },
        )
        const fileSurface = page.locator(
            '[data-testid="upup-file-hero"], [data-testid="upup-file-item"]',
        )
        await expect(fileSurface).toHaveCount(1)

        // 2. ...carrying the byte offset its persisted session proves was
        //    uploaded. This is the precondition that used to lock removal.
        await expect(
            page.locator('[data-testid="upup-progress-bar"]').first(),
            `${fw.name}: the restored paused file reopens at its persisted offset`,
        ).toHaveAttribute('aria-valuenow', String(RESTORED_PERCENT), {
            timeout: 15_000,
        })

        // 3. The contract: progress on a PAUSED file must not lock removal.
        const remove = page.locator('[data-testid="upup-file-remove"]').first()
        await expect(
            remove,
            `${fw.name}: a paused file must stay discardable — removal is the only path that aborts its server-side upload`,
        ).toBeEnabled()

        // 4. ...and the control actually works, on every framework.
        await remove.click()
        await expect(
            fileSurface,
            `${fw.name}: discarding the restored file drops it from the uploader`,
        ).toHaveCount(0)
    })
})
