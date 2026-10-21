import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'

/**
 * Every caller of both agents is an anonymous site visitor (no sign-in exists;
 * the origin token only binds the page origin), so the app must never send a
 * paid OpenRouter key to the Devino proxy, even when one is set in the env.
 * Each test drives the REAL agent against a stubbed proxy at the network edge
 * (global fetch) and inspects what actually went out.
 */

const PROXY_URL = 'https://proxyai.devino.ca/v1'
const PROXY_KEY = 'orf_test_upup_proxy_key'
const SENTINEL = 'sk-or-v1-NEVERLOGTHIS000000000000000000'

const ENV: Record<string, string> = {
    OPENROUTER_API_URL: PROXY_URL,
    OPENROUTER_API_KEY: PROXY_KEY,
    OPENROUTER_MODEL: 'glm-5.3',
    OPENROUTER_FALLBACK_API_KEY: SENTINEL,
    OPENROUTER_FALLBACK_MODEL: 'deepseek/deepseek-v4.1-flash',
    OPENROUTER_FALLBACK_AFTER_SECONDS: '8',
}

type Sent = { url: string; headers: Headers; body: string }

/** Stubs fetch for the proxy only; `reply` answers each proxy request. */
function stubProxy(reply: (body: Record<string, unknown>) => Response) {
    const sent: Sent[] = []
    // boundary-mock(the Devino proxy's OpenAI-compatible HTTP API)
    vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = typeof input === 'string' ? input : input.toString()
            if (!url.startsWith(PROXY_URL))
                throw new Error(`unexpected request to ${url}`)
            const body = String(init?.body ?? '')
            sent.push({ url, headers: new Headers(init?.headers), body })
            return reply(JSON.parse(body) as Record<string, unknown>)
        }),
    )
    return sent
}

/** An OpenAI-compatible answer, streamed or not, as the request asked. */
function completion(
    body: Record<string, unknown>,
    message: { content?: string; toolCall?: { name: string; args: string } },
): Response {
    const toolCalls = message.toolCall
        ? [
              {
                  index: 0,
                  id: `call_${Math.random().toString(36).slice(2)}`,
                  type: 'function',
                  function: {
                      name: message.toolCall.name,
                      arguments: message.toolCall.args,
                  },
              },
          ]
        : undefined
    const finish = toolCalls ? 'tool_calls' : 'stop'
    const base = { id: 'c1', created: 0, model: 'glm-5.3' }
    if (!body.stream)
        return Response.json({
            ...base,
            object: 'chat.completion',
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: message.content ?? null,
                        tool_calls: toolCalls,
                    },
                    finish_reason: finish,
                },
            ],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        })
    const chunks = [
        {
            ...base,
            object: 'chat.completion.chunk',
            choices: [
                {
                    index: 0,
                    delta: {
                        role: 'assistant',
                        content: message.content ?? null,
                        tool_calls: toolCalls,
                    },
                    finish_reason: null,
                },
            ],
        },
        {
            ...base,
            object: 'chat.completion.chunk',
            choices: [{ index: 0, delta: {}, finish_reason: finish }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        },
    ]
    const sse = `${chunks.map(c => `data: ${JSON.stringify(c)}\n\n`).join('')}data: [DONE]\n\n`
    return new Response(sse, {
        headers: { 'content-type': 'text/event-stream' },
    })
}

beforeAll(async () => {
    // The first @mastra/core load takes seconds on a busy machine; pay it once
    // here instead of inside the first test's time budget.
    await import('@mastra/core/agent')
}, 60_000)

beforeEach(() => {
    for (const [key, value] of Object.entries(ENV)) vi.stubEnv(key, value)
    // env.ts parses process.env once at import: re-import per test.
    vi.resetModules()
})

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
})

function expectNoPaidKey(sent: Sent[]) {
    expect(sent.length).toBeGreaterThan(0)
    for (const request of sent) {
        expect(request.headers.get('authorization')).toBe(`Bearer ${PROXY_KEY}`)
        for (const name of request.headers.keys())
            expect(name).not.toMatch(/^x-orf-/i)
        for (const value of request.headers.values())
            expect(value).not.toContain(SENTINEL)
        expect(request.body).not.toContain(SENTINEL)
    }
}

describe('a site visitor chatting with the assistants on the Devino proxy', () => {
    it('the docs assistant sends the proxy key and never the paid fallback key', async () => {
        const sent = stubProxy(body =>
            completion(body, { content: 'Use the maxFiles prop.' }),
        )
        const { docsAgent } = await import('./docs-agent.js')

        await docsAgent.generate('How do I limit the number of files?')

        expectNoPaidKey(sent)
    })

    it('the playground assistant sends the proxy key and never the paid fallback key', async () => {
        const sent = stubProxy(body =>
            completion(body, { content: 'Set allowedFileTypes to images.' }),
        )
        const { playgroundAgent } = await import('./playground-agent.js')

        await playgroundAgent.generate('photos only')

        expectNoPaidKey(sent)
    })

    it('a body that asks for paid help changes nothing: still no paid key goes out', async () => {
        const sent = stubProxy(body =>
            completion(body, { content: 'Set allowedFileTypes to images.' }),
        )
        const { playgroundAgent } = await import('./playground-agent.js')

        // What a client could put in the built-in /api/agents/:id/generate body.
        await playgroundAgent.generate('photos only', {
            providerOptions: {
                'devino-proxy': { fallbackKey: 'spoofed', paid: true },
            },
        } as never)

        expectNoPaidKey(sent)
    })
})

describe('the playground assistant step limit', () => {
    it('stops after five model requests when the model keeps calling its tool', async () => {
        const sent = stubProxy(body =>
            completion(body, {
                toolCall: {
                    name: 'applyConfigPatch',
                    args: JSON.stringify({
                        patch: { maxFiles: 2 },
                        explanation: 'At most two files.',
                    }),
                },
            }),
        )
        const { playgroundAgent } = await import('./playground-agent.js')

        await playgroundAgent.generate('two files at most')

        expect(sent).toHaveLength(5)
    })
})
