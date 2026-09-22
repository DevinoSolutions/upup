import { buildAgentSetupPrompt } from '@/lib/agent-setup/prompt'
import { captureServerEvent } from '@/lib/analytics/capture.server'

// /agent-setup/prompt.md — the file a coding agent fetches after the user
// pastes the "Onboard your agent to upup" sentence. Served raw: no auth, no
// JS, text/markdown, cached 5 min at the edge. The body is rendered from the
// manifest (src/lib/agent-setup) and is deterministic per build; the route is
// dynamic ONLY so the request's user-agent + referer can be logged — that log
// is how we see which agents actually pull the file.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const userAgent = request.headers.get('user-agent') ?? ''
    const referer = request.headers.get('referer') ?? ''
    console.info(
        JSON.stringify({
            event: 'agent_setup_prompt_fetched',
            userAgent,
            referer,
        }),
    )
    // Fire-and-forget: analytics must never delay or fail the response.
    void captureServerEvent('agent_setup_prompt_fetched', 'agent-setup', {
        app: 'upup',
        user_agent: userAgent,
        referer,
    })

    return new Response(buildAgentSetupPrompt(), {
        headers: {
            'content-type': 'text/markdown; charset=utf-8',
            'cache-control': 'public, max-age=300, s-maxage=300',
        },
    })
}
