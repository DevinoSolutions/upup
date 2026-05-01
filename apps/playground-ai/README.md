# @upup/playground-ai

Mastra agent that turns natural-language requests into `UpupConfig` patches for the
interactive playground (`packages/interactive-example`).

The agent owns one primary tool — `applyConfigPatch` — and operates against a zod
schema that mirrors the playground's config surface. It never returns code; it
only emits validated config patches the playground merges into its `ConfigContext`.

See [`docs/superpowers/plans/2026-04-30-playground-ai-mastra-copilotkit.md`](../../docs/superpowers/plans/2026-04-30-playground-ai-mastra-copilotkit.md)
for the full plan.

## Local dev

```bash
cp .env.example .env
# fill in ANTHROPIC_API_KEY and ORIGIN_TOKEN_SECRET
pnpm install
pnpm --filter @upup/playground-ai dev
```

This starts the Mastra dev server on `http://localhost:4111` and Mastra Studio
for inspecting the agent.

## Smoke test

```bash
curl http://localhost:4111/api/agents/playgroundAgent/generate \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"images only, max 10MB"}]}'
```

## Deploy

Phase 4 of the plan covers Cloudflare Workers deployment via Mastra's built-in
Cloudflare deployer. Until then, this app is local-only.

## Non-goals

- No code generation — the agent never returns JSX/TS source
- No editing of `@upup/server` — that's a hosted reference backend, owned elsewhere
- No persistent chat history — sessions are ephemeral
