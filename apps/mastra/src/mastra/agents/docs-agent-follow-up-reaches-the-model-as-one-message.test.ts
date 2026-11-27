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
 * Regression pin for T-17623: on prod the SECOND Ask AI question in a thread
 * came back as `400 - max_tokens must be at least 1, got -13107`. The free
 * model behind the Devino proxy fails on requests that carry an earlier
 * assistant turn (3 in 12 measured), while the same history as one user
 * message went 12 for 12. This drives the REAL docs agent (generate and
 * stream) against a stubbed proxy and reads the conversation off the wire:
 * a follow-up must reach the model as exactly one user message that still
 * carries the earlier turns, and a first question must reach it unchanged.
 */

const PROXY_URL = 'https://proxyai.devino.ca/v1'
const DOCS_ORIGIN = 'https://docs.example.test'

const ENV: Record<string, string> = {
    OPENROUTER_API_URL: PROXY_URL,
    OPENROUTER_API_KEY: 'orf_test_upup_proxy_key',
    OPENROUTER_MODEL: 'haiku',
    DOCS_BASE_URL: DOCS_ORIGIN,
}

const Q1 = 'How do I install upup for React?'
const A1 =
    'Run `npm i @useupup/react`. See https://useupup.com/docs/quickstarts/react/'
const Q2 = 'How do I use upup with Next.js server routes?'

type WireMessage = { role: string; content: unknown }
type ProxyRequest = { stream?: boolean; messages: WireMessage[] }

/** Stubs fetch: a proxy model that answers with plain text straight away. */
function stubAnsweringModel() {
    const proxyRequests: ProxyRequest[] = []
    // boundary-mock(the Devino proxy's OpenAI-compatible HTTP API)
    vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = typeof input === 'string' ? input : input.toString()
            if (!url.startsWith(PROXY_URL))
                throw new Error(`unexpected request to ${url}`)
            const body = JSON.parse(String(init?.body ?? '')) as ProxyRequest
            proxyRequests.push(body)
            const base = { id: 'c1', created: 0, model: 'haiku' }
            const usage = {
                prompt_tokens: 1,
                completion_tokens: 1,
                total_tokens: 2,
            }
            if (!body.stream)
                return Response.json({
                    ...base,
                    object: 'chat.completion',
                    choices: [
                        {
                            index: 0,
                            message: { role: 'assistant', content: 'Answer.' },
                            finish_reason: 'stop',
                        },
                    ],
                    usage,
                })
            const chunks = [
                {
                    ...base,
                    object: 'chat.completion.chunk',
                    choices: [
                        {
                            index: 0,
                            delta: { role: 'assistant', content: 'Answer.' },
                            finish_reason: null,
                        },
                    ],
                },
                {
                    ...base,
                    object: 'chat.completion.chunk',
                    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
                    usage,
                },
            ]
            const sse = `${chunks.map(c => `data: ${JSON.stringify(c)}\n\n`).join('')}data: [DONE]\n\n`
            return new Response(sse, {
                headers: { 'content-type': 'text/event-stream' },
            })
        }),
    )
    return proxyRequests
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

/** The non-system messages of the first model request, as plain text. */
async function conversationSent(
    mode: 'generate' | 'stream',
    messages: Array<
        | { role: 'user'; content: string }
        | { role: 'assistant'; content: string }
    >,
) {
    const proxyRequests = stubAnsweringModel()
    const { docsAgent } = await import('./docs-agent.js')
    if (mode === 'generate') await docsAgent.generate(messages)
    else await (await docsAgent.stream(messages)).consumeStream()
    expect(proxyRequests.length).toBeGreaterThan(0)
    return proxyRequests[0].messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role,
            text:
                typeof m.content === 'string'
                    ? m.content
                    : JSON.stringify(m.content),
        }))
}

describe('a docs follow-up question reaches the model as one user message', () => {
    it.each(['generate', 'stream'] as const)(
        'folds the earlier turns into the new question (%s)',
        async mode => {
            const sent = await conversationSent(mode, [
                { role: 'user', content: Q1 },
                { role: 'assistant', content: A1 },
                { role: 'user', content: Q2 },
            ])

            expect(sent.map(m => m.role)).toEqual(['user'])
            const text = sent[0].text
            expect(text).toContain(`User: ${Q1}`)
            expect(text).toContain('Assistant: Run `npm i @useupup/react`.')
            expect(text).toContain(`New question: ${Q2}`)
            // The new question comes last, after the context it builds on.
            expect(text.indexOf(`New question: ${Q2}`)).toBeGreaterThan(
                text.indexOf(`User: ${Q1}`),
            )
        },
        30_000,
    )

    it.each(['generate', 'stream'] as const)(
        'sends a first question unchanged (%s)',
        async mode => {
            const sent = await conversationSent(mode, [
                { role: 'user', content: Q2 },
            ])

            expect(sent).toEqual([{ role: 'user', text: Q2 }])
        },
        30_000,
    )
})
