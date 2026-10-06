import { describe, expect, it } from 'vitest'
import { demoUploadEventFor } from '@/lib/analytics/demo-upload-tracking'
import {
    DEMO_UPLOAD_FAILED,
    DEMO_UPLOAD_STARTED,
    DEMO_UPLOAD_SUCCEEDED,
} from '@/lib/analytics/contract'

// The demos' upload funnel is read off the uploader root's `data-state`
// transitions. The browser half (the MutationObserver wiring) is proven by the
// landing e2e demo-upload flow against a real bucket; this pins the mapping.

describe('demo upload funnel transitions', () => {
    it.each([
        ['ready', 'uploading', DEMO_UPLOAD_STARTED],
        ['idle', 'uploading', DEMO_UPLOAD_STARTED],
        ['failed', 'uploading', DEMO_UPLOAD_STARTED],
        ['uploading', 'successful', DEMO_UPLOAD_SUCCEEDED],
        ['uploading', 'failed', DEMO_UPLOAD_FAILED],
    ])('maps %s -> %s to %s', (previous, next, event) => {
        expect(demoUploadEventFor(previous, next)).toBe(event)
    })

    it('does not count a resumed upload as a second start', () => {
        expect(demoUploadEventFor('paused', 'uploading')).toBeNull()
    })

    it.each([
        ['idle', 'ready'],
        ['ready', 'processing'],
        ['uploading', 'paused'],
        ['successful', 'idle'],
        ['uploading', 'uploading'],
        ['successful', null],
    ])('ignores %s -> %s, which is not a funnel step', (previous, next) => {
        expect(demoUploadEventFor(previous, next)).toBeNull()
    })
})
