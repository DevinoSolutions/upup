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

/** A provider call failed because of something the CLIENT supplied or controls:
 *  the authorization code (expired, reused, forged) or the integrator's own
 *  OAuth app (client id/secret, redirect URI). Starting the sign-in again
 *  cannot succeed until that is fixed, so it is 424 (Failed Dependency).
 *  Cloudflare also passes 424 through, so the JSON body, the `UpupErrorCode` and
 *  `x-upup-request-id` reach the client (T-6087). */
export const DEPENDENCY_REJECTED_STATUS = 424

/** A provider call failed for a reason that is OURS or transient: the provider
 *  was unreachable, timed out, answered 5xx/429/408 or a non-4xx error, or sent
 *  a malformed success. Starting the sign-in again may succeed, so it stays 502.
 *  (The callback URL itself is never replayable: its state is consumed and the
 *  code is single-use.) Trade-off (T-6087): behind Cloudflare an origin 502 is
 *  replaced by Cloudflare's own text/plain page, so this body and request id
 *  are lost there; the cause still reaches `onError`.
 *  `tests/response-contract.test.ts` allows no other 502/504 literal in src/. */
export const UPSTREAM_UNAVAILABLE_STATUS = 502

/** Map a provider token endpoint's non-2xx status to ours: a 4xx other than
 *  408/429 is a rejection the client must fix (424); 5xx, 408, 429 and any
 *  non-4xx failure (an unfollowed 3xx, a 1xx) are ours or transient (502). */
export function providerFailureStatus(
    providerStatus: number,
): typeof DEPENDENCY_REJECTED_STATUS | typeof UPSTREAM_UNAVAILABLE_STATUS {
    const isClientError = providerStatus >= 400 && providerStatus < 500
    return isClientError && providerStatus !== 408 && providerStatus !== 429
        ? DEPENDENCY_REJECTED_STATUS
        : UPSTREAM_UNAVAILABLE_STATUS
}

export function corsHeaders(
    req: Request,
    config: UpupServerConfig,
): ResponseHeaders {
    const cors = config.cors
    if (!cors) return {}

    const origin = req.headers.get('origin') ?? ''
    const allowsWildcard = cors.allowedOrigins.includes('*')
    const allowsOrigin = origin && cors.allowedOrigins.includes(origin)
    // Vary: Origin goes on EVERY response once cors is configured, allowed or not:
    // a shared cache that stored a header-less reply to a disallowed (or
    // origin-less) request would otherwise serve it to an allowed origin.
    if (!allowsWildcard && !allowsOrigin) return { Vary: 'Origin' }

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
