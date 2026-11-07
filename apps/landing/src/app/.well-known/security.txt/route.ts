// GET /.well-known/security.txt (RFC 9116). Body and renewal rule:
// src/lib/security-txt.ts.
import { securityTxt } from '@/lib/security-txt'

export const dynamic = 'force-static'

export function GET(): Response {
    return new Response(securityTxt(), {
        status: 200,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
}
