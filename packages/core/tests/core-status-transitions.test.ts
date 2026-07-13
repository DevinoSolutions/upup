import { describe, it, expect } from 'vitest'
import { UpupCore } from '../src/core'
import { UploadStatus } from '@useupup/core'

const makeCore = () =>
    new UpupCore({ provider: 'aws', uploadEndpoint: '/api/upload' })

describe('UpupCore — status transitions', () => {
    it('starts at IDLE', () => {
        const core = makeCore()
        expect(core.status).toBe(UploadStatus.IDLE)
        core.destroy()
    })

    it('pause transitions to PAUSED', () => {
        const core = makeCore()
        core.pause()
        expect(core.status).toBe(UploadStatus.PAUSED)
        core.destroy()
    })

    it('resume transitions to UPLOADING', () => {
        const core = makeCore()
        core.resume()
        expect(core.status).toBe(UploadStatus.UPLOADING)
        core.destroy()
    })

    it('cancel transitions to IDLE', () => {
        const core = makeCore()
        core.pause()
        core.cancel()
        expect(core.status).toBe(UploadStatus.IDLE)
        core.destroy()
    })

    it('IDLE → pause → PAUSED → resume → UPLOADING', () => {
        const core = makeCore()
        expect(core.status).toBe(UploadStatus.IDLE)
        core.pause()
        expect(core.status).toBe(UploadStatus.PAUSED)
        core.resume()
        expect(core.status).toBe(UploadStatus.UPLOADING)
        core.destroy()
    })

    it('IDLE → pause → PAUSED → cancel → IDLE', () => {
        const core = makeCore()
        core.pause()
        expect(core.status).toBe(UploadStatus.PAUSED)
        core.cancel()
        expect(core.status).toBe(UploadStatus.IDLE)
        core.destroy()
    })

    it('destroy resets to IDLE', () => {
        const core = makeCore()
        core.pause()
        expect(core.status).toBe(UploadStatus.PAUSED)
        core.destroy()
        expect(core.status).toBe(UploadStatus.IDLE)
    })

    it('retry does not change status', () => {
        const core = makeCore()
        core.pause()
        core.retry()
        expect(core.status).toBe(UploadStatus.PAUSED)
        core.destroy()
    })

    it('multiple cancel calls stay at IDLE', () => {
        const core = makeCore()
        core.cancel()
        core.cancel()
        core.cancel()
        expect(core.status).toBe(UploadStatus.IDLE)
        core.destroy()
    })
})
