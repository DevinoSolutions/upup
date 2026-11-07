/**
 * Crash-recovery persistence is best-effort by design — a failed save/clear
 * must never break an upload. But full silence hides a dead durability
 * opt-in (F-734): surface failures dev-only, matching the worker-fallback
 * convention in maybeCreateWorkerProvider().
 */
export function warnCrashRecoveryFailure(op: 'save' | 'clear') {
    return (err: unknown): void => {
        if (
            typeof process !== 'undefined' &&
            process.env.NODE_ENV !== 'production'
        ) {
            console.warn(`[upup] crash-recovery ${op} failed`, err)
        }
    }
}

/**
 * Every crash-recovery storage write flows through this one promise chain.
 * Blob snapshots of large files make IndexedDB puts slow; fire-and-forget
 * save/clear calls complete out of order, so a save started before
 * completion can land after the completion clear and resurrect a finished
 * upload as a resumable one. FIFO ordering makes the last requested op the
 * last applied op.
 */
export class CrashRecoveryWriteQueue {
    private chain: Promise<void> = Promise.resolve()
    /** True while a snapshot sync is queued but not yet run. Progress ticks
     *  arrive far faster than a large snapshot writes; coalescing them into the
     *  one queued sync (which reads state at write time) keeps it to at most
     *  one write in flight plus one pending, instead of N stacked blob puts. */
    private syncQueued = false

    enqueue(op: () => Promise<void>): Promise<void> {
        const run = this.chain.then(op)
        this.chain = run.then(
            () => undefined,
            () => undefined,
        )
        return run
    }

    /** Queue a snapshot write that reads files/status at WRITE time, not at
     *  event time — `write` runs once the queue reaches it, so the write that
     *  runs last always reflects the state that came last. */
    queueSync(write: () => Promise<void>): void {
        if (this.syncQueued) return
        this.syncQueued = true
        void this.enqueue(async () => {
            this.syncQueued = false
            await write()
        })
    }
}
