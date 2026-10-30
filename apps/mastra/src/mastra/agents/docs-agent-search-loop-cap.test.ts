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
 * Regression pin for the Ask AI search-loop cap (569be572): Mastra's default
 * step budget is 5 and the docs agent used to burn all of it on back-to-back
 * searches, ending on `tool-calls` with no answer text. The agent now carries
 * an 8-step budget (at most 2 searches plus the answer) and is told to search
 * at most twice. This drives the REAL agent against a model that never stops
 * calling search-docs and counts what actually went out, so a lost `maxSteps`
 * (back to the default of 5) or a dropped prompt rule fails here.
 */

const PROXY_URL = 'https://proxyai.devino.ca/v1'
const DOCS_ORIGIN = 'https://docs.example.test'
const CORPUS = [
    '# Vue Quickstart',
    'https://useupup.com/docs/quickstarts/vue/',
    '',
    'Install @useupup/vue and render the uploader.',
].join('\n')

const ENV: Record<string, string> = {
    OPENROUTER_API_URL: PROXY_URL,
    OPENROUTER_API_KEY: 'orf_test_upup_proxy_key',
    OPENROUTER_MODEL: 'glm-5.3',
    DOCS_BASE_URL: DOCS_ORIGIN,
}

type ProxyRequest = Record<string, unknown>

/** Stubs fetch: the docs corpus plus a proxy model that only ever searches. */
function stubAlwaysSearchingModel() {
    const proxyRequests: ProxyRequest[] = []
    // boundary-mock(the Devino proxy's OpenAI-compatible HTTP API and the docs corpus host)
    vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = typeof input === 'string' ? input : input.toString()
            if (url === `${DOCS_ORIGIN}/docs/llms-full.txt`)
                return new Response(CORPUS)
            if (!url.startsWith(PROXY_URL))
                throw new Error(`unexpected request to ${url}`)
            const body = JSON.parse(String(init?.body ?? '')) as ProxyRequest
            proxyRequests.push(body)
            const toolCall = {
                index: 0,
                id: `call_${proxyRequests.length}`,
                type: 'function',
                function: {
                    name: 'searchDocs',
                    arguments: JSON.stringify({
                        query: 'install upup for Vue',
                    }),
                },
            }
            const base = { id: 'c1', created: 0, model: 'glm-5.3' }
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
                            message: {
                                role: 'assistant',
                                content: null,
                                tool_calls: [toolCall],
                            },
                            finish_reason: 'tool_calls',
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
                            delta: {
                                role: 'assistant',
                                content: null,
                                tool_calls: [toolCall],
                            },
                            finish_reason: null,
                        },
                    ],
                },
                {
                    ...base,
                    object: 'chat.completion.chunk',
                    choices: [
                        { index: 0, delta: {}, finish_reason: 'tool_calls' },
                    ],
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

describe('docs assistant search loop', () => {
    it('stops after 8 model calls when the model keeps searching instead of answering', async () => {
        const proxyRequests = stubAlwaysSearchingModel()
        const { docsAgent } = await import('./docs-agent.js')

        await docsAgent.generate('How do I install upup for Vue?')

        // Mastra's own default would stop at 5; 8 is the pinned budget.
        expect(proxyRequests).toHaveLength(8)
    }, 30_000)

    it('tells the model to search at most twice before answering', async () => {
        const proxyRequests = stubAlwaysSearchingModel()
        const { docsAgent } = await import('./docs-agent.js')

        await docsAgent.generate('How do I install upup for Vue?')

        const messages = proxyRequests[0].messages as Array<{
            role: string
            content: unknown
        }>
        const system = messages
            .filter(message => message.role === 'system')
            .map(message => JSON.stringify(message.content))
            .join('\n')
        expect(system).toContain('Search at most 2 times')
    }, 30_000)
})
