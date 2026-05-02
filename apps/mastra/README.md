# @upup/mastra

The Mastra app for the upup monorepo. Hosts agents, tools, middleware, and
custom routes shared across the project. Currently this means the
interactive-playground assistant (`playground-agent`); future agents land
here too.

Why "mastra" and not a feature-named app? So we don't end up with three
separate Mastra apps when we want a second agent. Mastra owns its own
HTTP server, so a single instance can serve as many agents as we register.

See [`docs/superpowers/plans/2026-04-30-playground-ai-mastra-copilotkit.md`](../../docs/superpowers/plans/2026-04-30-playground-ai-mastra-copilotkit.md)
for the original plan.

## Local dev

```bash
cp .env.example .env
# fill in OPENROUTER_API_KEY (default model is openrouter/anthropic/claude-haiku-4.5)
pnpm install
pnpm --filter @upup/mastra dev
```

This starts the Mastra dev server on `http://localhost:4111` and Mastra Studio
for inspecting agents.

## Smoke test

```bash
curl http://localhost:4111/api/agents/playground-agent/generate \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"images only, max 10MB"}]}'
```

## Eval suite

```bash
# In another terminal while `dev` is running:
pnpm --filter @upup/mastra eval
```

20 canned prompts; exits non-zero if the fail rate exceeds
`EVAL_FAIL_THRESHOLD` (default 10%).

## Adding a new agent

1. `src/mastra/agents/<name>-agent.ts` — instantiate `Agent` with id, instructions, model, tools
2. (optional) tools under `src/mastra/tools/<name>.ts`
3. Register in `src/mastra/index.ts` under `agents: { ... }`
4. Add eval cases under `src/evals/` if it's user-facing

The middleware stack (CORS, auth, rate-limit, daily budget) applies to all
registered agents automatically.

## Non-goals

- No code generation — agents return validated config patches, never JSX/TS source
- No editing of `@upup/server` — that's a hosted reference backend, owned elsewhere
- No persistent chat history — sessions are ephemeral
