// packages/server/src/observability.ts
//
// The one logger seam for @upup/server. Every error path in handler.ts routes
// through reportServerError() so integrators have exactly one place to wire an
// external sink (Datadog/Sentry/etc.) via config.onError, and a sane default
// (console.error) means the incident-blind-spot case is closed out of the box.
//
// Redaction contract: a UpupServerErrorEvent may ONLY be built from a static
// route string, req.method, the HTTP status, a machine code, a generic
// message, and the caught error's name/message/stack. Callers must never put
// request bodies, tokens, uploadTokenSecret, S3 credentials, signatures, or
// Authorization headers into an event.

export type UpupServerErrorEvent = {
    route: string
    method: string
    status: number
    code: string
    message: string
    requestId?: string | undefined
    error?: { name: string; message: string; stack?: string | undefined }
}

export type UpupServerLogger = (event: UpupServerErrorEvent) => void

export function toSafeError(
    e: unknown,
): NonNullable<UpupServerErrorEvent['error']> {
    return e instanceof Error
        ? { name: e.name, message: e.message, stack: e.stack }
        : { name: 'NonError', message: String(e) }
}

const defaultLogger: UpupServerLogger = event => {
    console.error('[upup:server]', JSON.stringify(event))
}

export function reportServerError(
    logger: UpupServerLogger | undefined,
    event: UpupServerErrorEvent,
): void {
    ;(logger ?? defaultLogger)(event)
}
