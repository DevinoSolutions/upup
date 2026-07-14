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

describe('observability — redaction (F-746)', () => {
    it('scrubs Authorization/bearer/AKIA/X-Amz-Signature from a reported error via the public seam', () => {
        const logged: UpupServerErrorEvent[] = []
        const token = 'eyJhbGciOiJIUzI1NiJ9.forged-body.forged-sig'
        // A poisoned error whose message accidentally interpolated secrets. The
        // OLD test hand-built a clean event and asserted an invented token was
        // absent — a tautology. This drives the real seam (reportServerError
        // with toSafeError, exactly how every route builds its event), so the
        // scrubbing is what makes the assertion pass, not the token never being
        // present in the first place.
        const poisoned = new Error(
            `Request failed: Authorization: Bearer ${token} ` +
                'X-Amz-Signature=deadbeefcafefeed AKIA1234567890ABCDEF',
        )
        reportServerError(e => logged.push(e), {
            route: 'files/google-drive/transfer',
            method: 'POST',
            status: 500,
            code: 'STORAGE_ERROR',
            message: 'Drive request failed',
            requestId: 'req-1',
            error: toSafeError(poisoned),
        })
        const serialized = JSON.stringify(logged[0])
        expect(serialized).not.toContain(token)
        expect(serialized).not.toContain('deadbeefcafefeed')
        expect(serialized).not.toContain('AKIA1234567890ABCDEF')
        // Proof the scrubber actually ran (not merely an absent secret).
        expect(serialized).toContain('[REDACTED')
    })

    it('leaves an ordinary message + stack intact (conservative — no over-redaction)', () => {
        const logged: UpupServerErrorEvent[] = []
        reportServerError(e => logged.push(e), {
            route: 'presign',
            method: 'POST',
            status: 500,
            code: 'PRESIGN_FAILED',
            message: 'Presign failed',
            error: toSafeError(new Error('boom')),
        })
        expect(logged[0]!.message).toBe('Presign failed')
        expect(logged[0]!.error?.message).toBe('boom')
    })
})
