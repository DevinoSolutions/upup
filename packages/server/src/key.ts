// packages/server/src/key.ts
import type { KeyStrategyContext } from "./config";

/**
 * Make a user-supplied filename safe to embed in an object key: drop directory
 * separators and anything outside [A-Za-z0-9._-], collapse runs to '_', strip
 * leading dots/underscores (no '.'/'..'), bound length. Never empty.
 */
export function sanitizeFilename(name: string): string {
  const cleaned = (name ?? "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^[._]+/, "")
    .slice(0, 128);
  return cleaned || "file";
}

/**
 * Default object-key layout: `<userId|anon>/<uuid>/<sanitized-filename>`. The
 * leading owner segment namespaces every upload so one caller can never address
 * or overwrite another's object; the uuid guarantees uniqueness even anonymously.
 */
export function defaultKeyStrategy(ctx: KeyStrategyContext): string {
  const owner = ctx.userId ?? "anon";
  return `${owner}/${crypto.randomUUID()}/${sanitizeFilename(ctx.fileName)}`;
}
