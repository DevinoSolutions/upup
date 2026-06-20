// Minimal ambient `process` so the dev-only diagnostic guard in core.ts
// (`typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'`)
// typechecks without pulling in all of @types/node. `process` may be absent at
// runtime in browser contexts — the typeof guard handles that; this only
// describes the narrow shape the guard reads.
declare const process:
  | { env?: { NODE_ENV?: string } & Record<string, string | undefined> }
  | undefined
