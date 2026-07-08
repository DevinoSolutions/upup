import type { UpupServerConfig } from '@upup/server'

/**
 * Typed helper for authoring a server config with full editor autocomplete and
 * type-checking. Returns the config unchanged — a thin pass-through.
 *
 * Required-field validation is intentionally NOT performed here (F-852): it
 * lives at construct time inside @upup/server's `createUpupHandler`, so it runs
 * for EVERY caller — including apps that call `createUpupNextHandler({...})`
 * directly without this wrapper (playground/landing did exactly that). A
 * `defineUpupConfig` that validated on its own left those direct callers
 * unprotected, which was the original bug this fold-in closes.
 */
export function defineUpupConfig(config: UpupServerConfig): UpupServerConfig {
    return config
}
