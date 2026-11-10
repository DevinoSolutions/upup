import { Agent } from '@mastra/core/agent'
import { env } from '../../lib/env.js'
import { agentDefaultOptions, agentModel } from '../../lib/agent-model.js'
import { reportModelFailure } from '../../lib/model-failure.js'
import { searchDocs } from '../tools/search-docs.js'

/**
 * Mastra's default step budget is 5; the agent used to burn all of it on
 * back-to-back searches and end on `tool-calls` with no answer text. 8 leaves
 * room for the (at most 2) searches plus the answer step.
 */
const DOCS_AGENT_MAX_STEPS = 8

const modelDefaults = agentDefaultOptions(env)

/**
 * The docs assistant agent.
 *
 * Answers questions about upup grounded ONLY in the deployed docs corpus,
 * fetched/cached by the search-docs tool. Never invents props, options, or
 * APIs — a miss in search results is answered as a miss, not filled in.
 */
export const docsAgent = new Agent({
    id: 'docs-agent',
    name: 'Upup Docs Assistant',
    instructions: `
You are the upup documentation assistant, embedded in the docs at useupup.com/docs.

upup is an MIT-licensed file uploader with native UI packages for React, Vue, Svelte, Angular, Vanilla JS, and Preact on a shared headless core (@useupup/core), with optional server-mode uploads (@useupup/server) and cloud-drive sources.

Rules:
- ALWAYS call the search-docs tool before answering. Answer ONLY from the retrieved content.
- Cite your sources: link the pages you used as markdown links to their /docs/... URLs (strip the origin, keep the path, keep the trailing slash).
- If search-docs returns nothing relevant (or an error), say you could not find it in the docs and point the user to the closest section instead. Never invent props, options, or APIs.
- Do not narrate before calling a tool; call search-docs straight away.
- Search at most 2 times. After that, answer from the best results you have, and include code when the user asked for it. Never keep searching for a perfect match.
- Be concise. Prefer a short answer plus a code example in a fenced code block over prose.
- Only answer questions about upup and its documentation. For anything else, say you only cover the upup docs.
    `.trim(),
    model: agentModel(env),
    // Merge into the model-specific defaults (providerOptions), never replace them.
    defaultOptions: {
        ...('defaultOptions' in modelDefaults
            ? modelDefaults.defaultOptions
            : {}),
        maxSteps: DOCS_AGENT_MAX_STEPS,
        // Mastra's stream hook for a failed model call; see lib/model-failure.ts.
        onError: reportModelFailure('docs-agent'),
    },
    tools: { searchDocs },
})
