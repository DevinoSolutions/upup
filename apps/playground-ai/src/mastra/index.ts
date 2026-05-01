import { Mastra } from '@mastra/core'
import { playgroundAgent } from './agents/playground-agent.js'

/**
 * The Mastra instance for @upup/playground-ai.
 *
 * Mastra owns the HTTP server (Hono under the hood) and exposes registered
 * agents at /api/agents/<agentId>/{generate,stream,...}. We don't add custom
 * routes yet — the playground hits the standard agent endpoints.
 *
 * Auth, rate limiting, and cost guards land in Phase 3 via middleware.
 */
export const mastra = new Mastra({
    agents: { playgroundAgent },
    server: {
        port: Number(process.env.PORT ?? 4111),
        host: process.env.MASTRA_HOST ?? 'localhost',
    },
})
