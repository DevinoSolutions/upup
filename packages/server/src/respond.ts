// packages/server/src/respond.ts
//
// The single home for forming an HTTP response in @useupup/server (F-108). A
// per-request Responder closes over the request's CORS headers AND an
// x-upup-request-id, so every route returns through `res.json`/`html`/
// `redirect`/`noContent`/`fail` and can NEVER forget the headers — omission is
// structurally impossible (there is no header parameter to leave off). After
// this module, a route that composes its own `new Response(...)` is a defect.

import type { UpupServerConfig } from './config'
import { reportServerError, toSafeError } from './observability'
import { UpupErrorCode } from '@useupup/core'

export type ResponseHeaders = Record<string, string>

/** The status for "the request was fine but a third-party provider it depends
 *  on (an OAuth token endpoint) failed or was unreachable".
 *
 *  Never 502/504 (T-6087): Cloudflare replaces EVERY origin 502/504 with its own
 *  text/plain "error code: 502" page, dropping the JSON body, the
 *  `UpupErrorCode` and `x-upup-request-id`, so a provider misconfiguration read
 *  as a Cloudflare outage. 424 (Failed Dependency) is passed through untouched.
 *  `tests/response-contract.test.ts` fails on a 502/504 status literal in src/. */
export const UPSTREAM_FAILURE_STATUS = 424

export function corsHeaders(
    req: Request,
    config: UpupServerConfig,
): ResponseHeaders {
    const cors = config.cors
    if (!cors) return {}

    const origin = req.headers.get('origin') ?? ''
    const allowsWildcard = cors.allowedOrigins.includes('*')
    const allowsOrigin = origin && cors.allowedOrigins.includes(origin)
    if (!allowsWildcard && !allowsOrigin) return {}

    // Never send a literal '*' to a browser (Origin present): reflect the matched
    // origin so no route (incl. /files/*, /presign) exposes a bare wildcard. '*'
    // is emitted only for origin-less (non-browser) requests (audit S3).
    const allowOrigin = origin ? origin : '*'
    const headers: ResponseHeaders = {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': (
            cors.allowedMethods ?? ['GET', 'POST', 'OPTIONS']
        ).join(', '),
        'Access-Control-Allow-Headers': (
            cors.allowedHeaders ?? ['Content-Type', 'Authorization']
        ).join(', '),
        'Access-Control-Max-Age': String(cors.maxAgeSeconds ?? 600),
        Vary: 'Origin',
    }
    // Credentialed CORS is gated on a CONCRETE allowlist match only — NEVER a
    // wildcard-only match. Reflecting an arbitrary origin (allowed solely via '*')
    // together with credentials would let any site make credentialed cross-origin
    // reads, so a '*'-configured server gets public, NON-credentialed CORS. To use
    // the server-mode drive client (`credentials: 'include'`), operators must
    // enumerate their app origin(s) in `allowedOrigins` (audit S3 / CORS review).
    if (allowsOrigin && allowOrigin !== '*') {
        headers['Access-Control-Allow-Credentials'] = 'true'
    }
    return headers
}

export type Responder = {
    /** This request's correlation id — also emitted as the
     *  x-upup-request-id header on every response. */
    requestId: string
    json(data: unknown, status?: number): Response
    /** `extra` headers (e.g. a Set-Cookie) are layered on after the baked-in
     *  CORS + request-id headers; they cannot remove those. */
    html(body: string, status?: number, extra?: ResponseHeaders): Response
    redirect(
        location: string,
        status?: number,
        extra?: ResponseHeaders,
    ): Response
    noContent(status?: number): Response
    /** One home for every logged failure: reports via the onError seam (redacted),
     *  then returns the uniform `{ error, code }` body. The real cause goes to the
     *  logger, never the client. */
    fail(
        route: string,
        method: string,
        status: number,
        code: string,
        message: string,
        error: unknown,
    ): Response
}

export function createResponder(
    req: Request,
    config: UpupServerConfig,
): Responder {
    const requestId = crypto.randomUUID()
    const headers: ResponseHeaders = {
        ...corsHeaders(req, config),
        'x-upup-request-id': requestId,
    }
    const json = (data: unknown, status = 200): Response =>
        new Response(JSON.stringify(data), {
            status,
            headers: { 'Content-Type': 'application/json', ...headers },
        })
    return {
        requestId,
        json,
        html: (body, status = 200, extra) =>
            new Response(body, {
                status,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    ...headers,
                    ...extra,
                },
            }),
        redirect: (location, status = 302, extra) =>
            new Response(null, {
                status,
                headers: { ...headers, ...extra, Location: location },
            }),
        noContent: (status = 204) => new Response(null, { status, headers }),
        fail: (route, method, status, code, message, error) => {
            reportServerError(config.onError, {
                route,
                method,
                status,
                code,
                message,
                requestId,
                error: toSafeError(error),
            })
            return json({ error: message, code }, status)
        },
    }
}

/** Every route reads named fields off the body, so only a JSON OBJECT is a
 *  usable body: `null`, an array or a scalar is a client error, not something to
 *  dereference (it used to surface as a 500). */
export function isJsonObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Parse a JSON request body, returning a 400 Response (not an unhandled throw)
 *  on malformed JSON or a non-object body. Collapses the two divergent
 *  body-parse sites. */
export async function parseJsonBody(
    req: Request,
    res: Responder,
): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
    try {
        const value: unknown = await req.json()
        if (!isJsonObject(value)) {
            return {
                ok: false,
                response: res.json(
                    {
                        error: 'Request body must be a JSON object',
                        code: UpupErrorCode.BAD_REQUEST,
                    },
                    400,
                ),
            }
        }
        return { ok: true, value }
    } catch {
        // upup-catch: malformed JSON becomes a 400 Result the caller returns —
        // the parse failure is surfaced to the client, not swallowed.
        return {
            ok: false,
            response: res.json(
                { error: 'Invalid JSON body', code: UpupErrorCode.BAD_REQUEST },
                400,
            ),
        }
    }
}
