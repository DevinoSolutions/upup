import { registerApiRoute } from '@mastra/core/server'
import { dailyBudgetSnapshot } from '../middleware/daily-budget.js'

/**
 * Liveness + lightweight observability route.
 *
 * Returns 200 OK plus the current daily-budget snapshot so the deployer's
 * health check has something to grep, and operators can curl it to see
 * how much of today's request quota is left.
 */
export const healthzRoute = registerApiRoute('/healthz', {
    method: 'GET',
    handler: async (c) => {
        const budget = dailyBudgetSnapshot()
        return c.json({
            ok: true,
            uptime: process.uptime(),
            budget,
        })
    },
})
