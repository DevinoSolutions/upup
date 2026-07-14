import { describe, expect, it } from 'vitest'
import {
    computeSpeedEta,
    SPEED_SAMPLE_WINDOW_MS,
    type SpeedSample,
} from '../src/orchestrator/upload-speed'

/** Pure speed/ETA math extracted from the orchestrator's progress handler (F-721). */
describe('computeSpeedEta', () => {
    const base = {
        previousSpeed: 0,
        previousEta: 0,
    }

    it('carries previous speed/eta forward while under two samples', () => {
        const result = computeSpeedEta({
            ...base,
            samples: [],
            now: 1_000,
            uploadedBytes: 100,
            totalBytes: 1_000,
            previousSpeed: 42,
            previousEta: 7,
        })
        expect(result.samples).toHaveLength(1)
        expect(result.speed).toBe(42)
        expect(result.eta).toBe(7)
    })

    it('computes bytes/second across the sample window and a ceil eta', () => {
        const samples: SpeedSample[] = [{ time: 1_000, bytes: 0 }]
        const result = computeSpeedEta({
            ...base,
            samples,
            now: 3_000, // 2s elapsed
            uploadedBytes: 200, // 100 B/s
            totalBytes: 1_000, // 800 remaining -> 8s
        })
        expect(result.speed).toBe(100)
        expect(result.eta).toBe(8)
    })

    it('drops samples older than the window', () => {
        const samples: SpeedSample[] = [
            { time: 0, bytes: 0 }, // stale
            { time: 9_000, bytes: 500 },
        ]
        const result = computeSpeedEta({
            ...base,
            samples,
            now: 10_000,
            uploadedBytes: 600,
            totalBytes: 1_000,
        })
        expect(
            result.samples.every(
                s => s.time >= 10_000 - SPEED_SAMPLE_WINDOW_MS,
            ),
        ).toBe(true)
        // window = 9_000..10_000: 100 bytes over 1s
        expect(result.speed).toBe(100)
        expect(result.eta).toBe(4)
    })

    it('never reports negative speed and zero speed yields zero eta', () => {
        const shrinking: SpeedSample[] = [{ time: 1_000, bytes: 500 }]
        const result = computeSpeedEta({
            ...base,
            samples: shrinking,
            now: 2_000,
            uploadedBytes: 400, // fewer bytes than before (aborted file)
            totalBytes: 1_000,
        })
        expect(result.speed).toBe(0)
        expect(result.eta).toBe(0)
    })

    it('ignores zero-elapsed windows (two samples at the same timestamp)', () => {
        const samples: SpeedSample[] = [{ time: 5_000, bytes: 100 }]
        const result = computeSpeedEta({
            ...base,
            samples,
            now: 5_000,
            uploadedBytes: 300,
            totalBytes: 1_000,
            previousSpeed: 55,
            previousEta: 9,
        })
        expect(result.speed).toBe(55)
        expect(result.eta).toBe(9)
    })
})
