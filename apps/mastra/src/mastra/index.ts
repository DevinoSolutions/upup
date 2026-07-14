import { Mastra } from '@mastra/core'
import { env } from '../lib/env.js'
import { playgroundAgent } from './agents/playground-agent.js'
import { corsMiddleware } from './middleware/cors.js'
import { authMiddleware } from './middleware/auth.js'
import { rateLimitMiddleware } from './middleware/rate-limit.js'
import { dailyBudgetMiddleware } from './middleware/daily-budget.js'
import { healthzRoute } from './routes/healthz.js'
import { schemaRoute } from './routes/schema.js'

/**
 * The Mastra instance for mastra (the workspace package).
 *
 * Mastra owns the HTTP server (Hono under the hood) and exposes registered
 * agents at /api/agents/<agentId>/{generate,stream,...}. We layer on:
 *   - CORS (always, env-driven allowlist)
 *   - Origin-token auth (off in dev, on when ORIGIN_TOKEN_SECRET is set)
 *   - Per-IP rate limiter (token bucket, in-memory)
 *   - Daily request budget (in-memory, resets UTC midnight)
 *   - Custom routes: /healthz, /schema
 */
export const mastra = new Mastra({
    agents: { playgroundAgent },
    server: {
        port: env.PORT,
        host: env.MASTRA_HOST,
        middleware: [
            { handler: corsMiddleware() as any, path: '/*' },
            { handler: dailyBudgetMiddleware() as any, path: '/*' },
            { handler: rateLimitMiddleware() as any, path: '/*' },
            // Auth runs last so health checks pass even when token is missing —
            // and so the cheaper rejections (rate / budget) short-circuit first.
            { handler: authMiddleware() as any, path: '/api/agents/*' },
        ],
        apiRoutes: [healthzRoute, schemaRoute],
    },
})
