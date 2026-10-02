import { DEFAULT_OPENROUTER_API_URL } from './env.js'

/**
 * Which model the agents talk to, and through which OpenAI-compatible API.
 *
 * With OPENROUTER_API_URL at its OpenRouter default the agents keep Mastra's
 * built-in `openrouter/<model>` router, exactly as before. Any other base URL
 * (the Devino proxy, https://proxyai.devino.ca/v1) gets an explicit
 * OpenAI-compatible config under the provider id below, plus reasoning effort
 * "none" on every request: without it the free reasoning models behind the
 * proxy spend the first-byte budget thinking before the first token.
 */
export const PROXY_PROVIDER_ID = 'devino-proxy'

export type AgentModelEnv = {
    OPENROUTER_API_URL: string
    OPENROUTER_MODEL: string
    OPENROUTER_API_KEY?: string
}

export function usesOpenRouter(e: AgentModelEnv): boolean {
    return e.OPENROUTER_API_URL === DEFAULT_OPENROUTER_API_URL
}

export function agentModel(e: AgentModelEnv) {
    if (usesOpenRouter(e)) return `openrouter/${e.OPENROUTER_MODEL}` as const
    return {
        providerId: PROXY_PROVIDER_ID,
        modelId: e.OPENROUTER_MODEL,
        url: e.OPENROUTER_API_URL,
        apiKey: e.OPENROUTER_API_KEY,
    }
}

/** Agent `defaultOptions` to spread in: empty on OpenRouter. */
export function agentDefaultOptions(e: AgentModelEnv) {
    if (usesOpenRouter(e)) return {}
    return {
        defaultOptions: {
            providerOptions: {
                [PROXY_PROVIDER_ID]: { reasoning: { effort: 'none' } },
            },
        },
    }
}
