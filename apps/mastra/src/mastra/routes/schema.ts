import { registerApiRoute } from '@mastra/core/server'
import { renderSchemaForPrompt } from '../schema/upup-config.schema.js'

/**
 * Returns the documented UpupConfig schema as the playground sees it.
 *
 * The playground can fetch this once at startup to keep its sidebar copy
 * in sync with whatever the agent considers valid. Cached for an hour by
 * default — the schema only changes when this app is redeployed.
 */
export const schemaRoute = registerApiRoute('/schema', {
    method: 'GET',
    handler: async (c) => {
        c.header('cache-control', 'public, max-age=3600')
        return c.json({ schema: renderSchemaForPrompt() })
    },
})
