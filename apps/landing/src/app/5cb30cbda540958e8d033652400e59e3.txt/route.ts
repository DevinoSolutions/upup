import { INDEXNOW_KEY } from '@/lib/indexnow'

// The IndexNow ownership key file. The directory name above is the key and
// must match INDEXNOW_KEY exactly — src/__tests__/indexnow.test.ts pins it.
// Static: the body is a constant, so there is nothing to compute per request.
export const dynamic = 'force-static'

export function GET() {
    return new Response(INDEXNOW_KEY, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
        },
    })
}
