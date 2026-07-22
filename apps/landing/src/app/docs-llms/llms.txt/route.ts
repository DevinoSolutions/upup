import { buildLlmsIndex } from '@/lib/docs/llms'

export const dynamic = 'force-static'

export function GET() {
    return new Response(buildLlmsIndex(), {
        headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
}
