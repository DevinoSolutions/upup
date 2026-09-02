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
    html(body: string, status?: number): Response
    redirect(location: string, status?: number): Response
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
        html: (body, status = 200) =>
            new Response(body, {
                status,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    ...headers,
                },
            }),
        redirect: (location, status = 302) =>
            new Response(null, {
                status,
                headers: { ...headers, Location: location },
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

/** Parse a JSON request body, returning a 400 Response (not an unhandled throw)
 *  on malformed JSON. Collapses the two divergent body-parse sites. */
export async function parseJsonBody(
    req: Request,
    res: Responder,
): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
    try {
        const value: unknown = await req.json()
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
