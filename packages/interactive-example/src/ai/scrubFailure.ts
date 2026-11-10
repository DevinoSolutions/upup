/** Longest upstream reason that leaves the page for an error tracker. */
export const FAILURE_MESSAGE_CAP = 200

/** Shortest prompt worth redacting; shorter ones would shred ordinary words. */
const MIN_PROMPT_REDACT = 4

// Key-like tokens an upstream error can echo back: provider keys (`sk-...`),
// auth headers, and any long hex/base64/url-safe run (>= 32 chars).
const KEY_LIKE = [
    /sk-[A-Za-z0-9_-]{8,}/g,
    /Bearer\s+\S+/gi,
    /[A-Za-z0-9+/_-]{32,}={0,2}/g,
]

/**
 * Make an upstream error message safe to send to an error tracker: redact the
 * visitor's prompt if the provider echoed it, redact key-like tokens, THEN cap
 * the length (capping first could cut a token in half and leave its head).
 */
export function scrubFailureMessage(message: string, prompt?: string): string {
    let out = message
    const needle = prompt?.trim()
    if (needle && needle.length >= MIN_PROMPT_REDACT) {
        out = out.split(needle).join('[redacted]')
        // A provider that echoes the request as JSON escapes newlines and
        // quotes in the prompt, so the raw form no longer matches.
        const escaped = JSON.stringify(needle).slice(1, -1)
        if (escaped !== needle) out = out.split(escaped).join('[redacted]')
    }
    for (const pattern of KEY_LIKE) out = out.replace(pattern, '[redacted]')
    return out.slice(0, FAILURE_MESSAGE_CAP)
}
