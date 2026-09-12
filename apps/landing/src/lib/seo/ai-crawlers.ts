/**
 * The AI/answer-engine crawlers robots.txt names explicitly.
 *
 * The `*` rule already allows them — this second group exists because an
 * unnamed crawler is an unproven one. Several of these agents (Google-Extended,
 * Applebot-Extended, anthropic-ai) are OPT-OUT tokens whose absence is
 * ambiguous to auditors, and answer engines publish these exact names as the
 * string they match; spelling them out is how the allow decision becomes
 * legible in the artifact a reviewer (or an owner) actually reads.
 *
 * Order is grouped by operator, not alphabetical, so a name added for a vendor
 * lands next to its siblings. The list is pinned by
 * `src/__tests__/seo-surfaces.test.ts` — adding or dropping a name is a
 * deliberate policy change, so update the pin in the same commit.
 */
export const AI_CRAWLER_USER_AGENTS = [
    // OpenAI: training crawler, search index, and on-demand user fetches.
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    // Anthropic: index, on-demand user fetch, search, and the legacy token.
    'ClaudeBot',
    'Claude-User',
    'Claude-SearchBot',
    'anthropic-ai',
    // Perplexity: index + on-demand user fetch.
    'PerplexityBot',
    'Perplexity-User',
    // Google: Gemini/AI-Overviews opt-out token plus the search crawler that
    // actually fetches the bytes those surfaces quote.
    'Google-Extended',
    'Googlebot',
    // Microsoft/Copilot.
    'Bingbot',
    // Apple: Siri/Spotlight crawler + its AI-training opt-out token.
    'Applebot',
    'Applebot-Extended',
    // Common Crawl — the corpus most open models are trained from.
    'CCBot',
    // Amazon (Alexa/Rufus), ByteDance (Doubao/TikTok search), Meta AI.
    'Amazonbot',
    'Bytespider',
    'meta-externalagent',
] as const
