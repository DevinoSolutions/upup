import type { Page } from '@playwright/test'

// 2 KB — passes minFileSize=1KB in the test app
export const FILE_2KB = Buffer.alloc(2 * 1024, 'x')

// Wipe the crash-recovery IndexedDB so a prior run's persisted files don't leak
// into the next test. Resolves on success/error/blocked so it never hangs a run.
export async function clearCrashRecovery(page: Page) {
    await page.evaluate(
        () =>
            new Promise<void>((resolve) => {
                const req = indexedDB.deleteDatabase('upup-crash-recovery')
                req.onsuccess = () => resolve()
                req.onerror = () => resolve()
                req.onblocked = () => resolve()
            }),
    )
}
