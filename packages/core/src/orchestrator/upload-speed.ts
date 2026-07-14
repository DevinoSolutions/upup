/**
 * Pure upload-speed/ETA math, extracted from the orchestrator's
 * upload-progress handler (F-721) so it is testable in isolation.
 *
 * Speed is a moving average over a sliding sample window: each progress event
 * appends a (time, cumulative-bytes) sample, samples older than the window
 * are dropped, and speed is the byte delta across the surviving window. When
 * fewer than two samples remain, the previous speed/eta are carried forward.
 */

export interface SpeedSample {
    time: number
    bytes: number
}

export interface SpeedEtaResult {
    samples: SpeedSample[]
    /** Bytes per second, never negative. */
    speed: number
    /** Whole seconds remaining; 0 when speed is 0. */
    eta: number
}

export const SPEED_SAMPLE_WINDOW_MS = 3000

export function computeSpeedEta(args: {
    samples: SpeedSample[]
    now: number
    uploadedBytes: number
    totalBytes: number
    previousSpeed: number
    previousEta: number
}): SpeedEtaResult {
    const { now, uploadedBytes, totalBytes, previousSpeed, previousEta } = args

    const samples = [
        ...args.samples,
        { time: now, bytes: uploadedBytes },
    ].filter(s => s.time >= now - SPEED_SAMPLE_WINDOW_MS)

    let speed = previousSpeed
    let eta = previousEta
    if (samples.length >= 2) {
        const oldest = samples[0]
        const newest = samples[samples.length - 1]
        if (oldest && newest) {
            const elapsed = (newest.time - oldest.time) / 1000
            if (elapsed > 0) {
                speed = Math.max(0, (newest.bytes - oldest.bytes) / elapsed)
                const remaining = totalBytes - uploadedBytes
                eta = speed > 0 ? Math.ceil(remaining / speed) : 0
            }
        }
    }

    return { samples, speed, eta }
}
