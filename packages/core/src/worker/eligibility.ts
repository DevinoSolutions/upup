export function isWorkerEligible(
    opts: { webWorker?: boolean },
    hasWorker: boolean,
    stepCount: number,
): boolean {
    if (opts.webWorker === false) return false
    if (!hasWorker) return false
    return stepCount > 0
}
