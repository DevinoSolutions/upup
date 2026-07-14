/**
 * Suggested first prompts for the empty AI panel state.
 *
 * Tuned to be:
 * - short and concrete (one line each)
 * - results visible in <2s
 * - exercise different parts of the schema (file rules, sources, theme)
 *
 * Keep this set small (3 items). More than 3 turns into a menu, which
 * undermines the "just type what you want" framing.
 */
export const PROMPT_SEEDS: readonly string[] = [
    'Photos only, max 10MB',
    'Add Google Drive and Dropbox',
    'Make it dark with rounded corners',
] as const
