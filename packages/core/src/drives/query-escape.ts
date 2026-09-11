/**
 * Escape a value for use inside a Google Drive API query string literal
 * (single-quoted). Backslashes must be escaped BEFORE quotes, or the backslash
 * this function adds in front of a quote would itself be doubled and the quote
 * would close the literal anyway — which is the query injection (audit S5).
 *
 * This lives in core because BOTH halves build Drive queries: the client-mode
 * `GoogleDrivePlugin` and the server-mode drive client. It used to exist only in
 * `@useupup/server`, so the browser plugin interpolated folder ids raw.
 * `@useupup/server` imports this one rather than keeping a second copy.
 *
 * Twin: `scripts/drive-sandbox/seed.mjs` escapeGDriveQueryValue — that one runs
 * outside the workspace graph and must be kept in sync by hand.
 */
export function escapeDriveQueryValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}
