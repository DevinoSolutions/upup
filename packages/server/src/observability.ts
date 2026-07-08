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

// Best-effort redaction of credential-shaped substrings from free-form error
// text (an error's message + stack) before it reaches config.onError. This
// makes the module's redaction contract STRUCTURAL rather than a comment a
// caller must remember (F-746): even an error whose message accidentally
// interpolated a token/Authorization header/signed-URL is scrubbed at this one
// seam. It is conservative by design — each pattern targets a known secret
// shape and leaves ordinary stack frames (file paths, function names) intact;
// it is defense-in-depth, not licence to build an event from a secret.
const SCRUBBERS: ReadonlyArray<readonly [RegExp, string]> = [
    // `Authorization: Bearer xxx` / `authorization=xxx` header dumps.
    [/(authorization)(\s*[:=]\s*)(?:bearer\s+)?[^\s,;"']+/gi, '$1$2[REDACTED]'],
    // Standalone bearer tokens not preceded by the header name.
    [/\bbearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]'],
    // SigV4 signature / credential / security-token query params or headers.
    [
        /(x-amz-(?:signature|credential|security-token))(\s*[:=]\s*)[^\s&,;"']+/gi,
        '$1$2[REDACTED]',
    ],
    // AWS access-key ids.
    [/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED_AWS_KEY]'],
]

function scrubSensitive(text: string): string {
    return SCRUBBERS.reduce((acc, [re, repl]) => acc.replace(re, repl), text)
}

const defaultLogger: UpupServerLogger = event => {
    console.error('[upup:server]', JSON.stringify(event))
}

export function reportServerError(
    logger: UpupServerLogger | undefined,
    event: UpupServerErrorEvent,
): void {
    // Scrub at the single seam every error path routes through, so redaction
    // cannot be forgotten by a caller that hand-built the event (F-746).
    const scrubbed: UpupServerErrorEvent = {
        ...event,
        message: scrubSensitive(event.message),
    }
    if (event.error) {
        scrubbed.error = {
            name: event.error.name,
            message: scrubSensitive(event.error.message),
            stack: event.error.stack
                ? scrubSensitive(event.error.stack)
                : undefined,
        }
    }
    ;(logger ?? defaultLogger)(scrubbed)
}
