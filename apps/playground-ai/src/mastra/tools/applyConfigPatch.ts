import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { UpupConfigSchema } from '../schema/upup-config.schema.js'

/**
 * Primary tool: the agent emits a Partial<UpupConfig> patch describing the
 * change it wants the playground to apply. The patch is validated against
 * UpupConfigSchema before returning — the playground trusts that anything
 * coming back from this tool already type-checks against the schema.
 *
 * The tool does NOT mutate any state. It returns the validated patch; the
 * playground's CopilotKit handler merges it into ConfigContext.
 */
export const applyConfigPatch = createTool({
    id: 'apply-config-patch',
    description:
        'Apply a partial UpupConfig patch to the live playground. ' +
        'Use the smallest patch that achieves the user intent. ' +
        'Never include fields not present in the schema.',
    inputSchema: z.object({
        patch: UpupConfigSchema.partial().describe(
            'The minimal UpupConfig diff to apply. Only include fields you intend to change.',
        ),
        explanation: z
            .string()
            .min(1)
            .max(500)
            .describe('Plain-English summary of what this patch changes and why.'),
    }),
    outputSchema: z.object({
        patch: UpupConfigSchema.partial(),
        explanation: z.string(),
    }),
    execute: async ({ patch, explanation }) => {
        // inputSchema already validated the patch via UpupConfigSchema.partial().
        // Returning verbatim — the playground does the actual merge.
        return { patch, explanation }
    },
})
