import { buildLlmsIndex } from '@/lib/docs/llms'

// Content is frozen at build time — a docs edit appears only after rebuild/redeploy.
export const dynamic = 'force-static'

export function GET() {
    return new Response(buildLlmsIndex(), {
        headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
}
