import { describe, expect, it } from 'vitest'
import {
    DEFAULT_OPENROUTER_API_URL,
    DEFAULT_OPENROUTER_MODEL,
    serverSchema,
} from './env.js'
import {
    PROXY_PROVIDER_ID,
    agentDefaultOptions,
    agentModel,
} from './agent-model.js'

const PROXY_URL = 'https://proxyai.devino.ca/v1'

describe('the agents model base URL', () => {
    it('defaults to OpenRouter and the Haiku model when nothing is set', () => {
        const e = serverSchema.parse({})
        expect(e.OPENROUTER_API_URL).toBe('https://openrouter.ai/api/v1')
        expect(e.OPENROUTER_MODEL).toBe('anthropic/claude-haiku-4.5')
    })

    it('treats empty strings from a bare compose passthrough as unset', () => {
        const e = serverSchema.parse({
            OPENROUTER_API_URL: '',
            OPENROUTER_MODEL: '',
        })
        expect(e.OPENROUTER_API_URL).toBe(DEFAULT_OPENROUTER_API_URL)
        expect(e.OPENROUTER_MODEL).toBe(DEFAULT_OPENROUTER_MODEL)
    })

    it('uses a custom base URL and strips its trailing slashes', () => {
        expect(
            serverSchema.parse({ OPENROUTER_API_URL: PROXY_URL })
                .OPENROUTER_API_URL,
        ).toBe(PROXY_URL)
        expect(
            serverSchema.parse({ OPENROUTER_API_URL: `${PROXY_URL}//` })
                .OPENROUTER_API_URL,
        ).toBe(PROXY_URL)
    })

    it('rejects a base URL that is not a URL', () => {
        expect(() =>
            serverSchema.parse({ OPENROUTER_API_URL: 'proxyai' }),
        ).toThrow()
    })
})

describe('agentModel', () => {
    it('keeps the exact OpenRouter router string the agents used before', () => {
        const e = serverSchema.parse({ OPENROUTER_API_KEY: 'k' })
        expect(agentModel(e)).toBe('openrouter/anthropic/claude-haiku-4.5')
        expect(agentDefaultOptions(e)).toEqual({})
    })

    it('points at the proxy with the pinned model, the key, and reasoning off', () => {
        const e = serverSchema.parse({
            OPENROUTER_API_URL: `${PROXY_URL}/`,
            OPENROUTER_MODEL: 'glm-5.3',
            OPENROUTER_API_KEY: 'k',
        })
        expect(agentModel(e)).toEqual({
            providerId: PROXY_PROVIDER_ID,
            modelId: 'glm-5.3',
            url: PROXY_URL,
            apiKey: 'k',
        })
        expect(agentDefaultOptions(e)).toEqual({
            defaultOptions: {
                providerOptions: {
                    [PROXY_PROVIDER_ID]: { reasoning: { effort: 'none' } },
                },
            },
        })
    })
})
