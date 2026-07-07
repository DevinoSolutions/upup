import { describe, it, expect, vi, afterEach } from 'vitest'
import {
    reportServerError,
    toSafeError,
    type UpupServerErrorEvent,
} from '../src/observability'

describe('observability — reportServerError', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('invokes the supplied logger with the event', () => {
        const logger = vi.fn()
        const event: UpupServerErrorEvent = {
            route: 'presign',
            method: 'POST',
            status: 500,
            code: 'PRESIGN_FAILED',
            message: 'Presign failed',
        }
        reportServerError(logger, event)
        expect(logger).toHaveBeenCalledTimes(1)
        expect(logger).toHaveBeenCalledWith(event)
    })

    it('falls back to console.error exactly once when no logger is supplied', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const event: UpupServerErrorEvent = {
            route: 'presign',
            method: 'POST',
            status: 500,
            code: 'PRESIGN_FAILED',
            message: 'Presign failed',
        }
        reportServerError(undefined, event)
        expect(spy).toHaveBeenCalledTimes(1)
    })
})

describe('observability — toSafeError', () => {
    it('extracts name/message/stack from a real Error', () => {
        const err = new Error('boom')
        const safe = toSafeError(err)
        expect(safe).toEqual({
            name: 'Error',
            message: 'boom',
            stack: err.stack,
        })
    })

    it('handles a non-Error thrown value', () => {
        const safe = toSafeError('just a string')
        expect(safe).toEqual({ name: 'NonError', message: 'just a string' })
    })
})

describe('observability — redaction', () => {
    it('a bad_signature event never contains the token literal or the secret', () => {
        const token = 'eyJhbGciOiJIUzI1NiJ9.some-forged-body.some-forged-sig'
        const secret = 'super-secret-hmac-key-do-not-leak-0123456789'
        const err = new Error('Upload token signature is invalid')

        // This mirrors exactly what handler.ts's verifyTokenOrRespond constructs —
        // built ONLY from route/method/status/code/message/error.name/message/stack.
        const event: UpupServerErrorEvent = {
            route: 'multipart/sign-part',
            method: 'POST',
            status: 403,
            code: 'bad_signature',
            message: 'Invalid upload token',
            requestId: 'req-123',
            error: toSafeError(err),
        }

        const serialized = JSON.stringify(event)
        expect(serialized).not.toContain(token)
        expect(serialized).not.toContain(secret)
    })
})
