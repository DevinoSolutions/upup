# Playground AI: Mastra + CopilotKit wiring plan

**Date:** 2026-04-30
**Status:** Drafted, not implemented
**Owner:** Amin
**Effort estimate:** 1–2 weeks

## Goal

Add a chat panel to the existing interactive playground (`packages/interactive-example`) that lets a user describe an upload setup in natural language and have it applied to the live config. The AI **only nudges config** — it does not edit code, does not run code, does not own a code editor.

## Non-goals (deliberate)

- ❌ No Monaco editor in the playground
- ❌ No Sandpack live preview from edited code
- ❌ No bidirectional code↔config sync (`parseCode`)
- ❌ No editable `@upup/server` code (use the existing hosted reference backend)
- ❌ The AI never returns code — it returns config patches against the documented `UpupConfig` schema

If users ask for code editing later, revisit. Don't build it speculatively.

## Architecture overview

```
┌────────────────────────────────────────┐         ┌──────────────────────────┐
│ packages/interactive-example           │         │ apps/playground-ai       │
│   ┌──────────────────────────────────┐ │         │   (Mastra app)           │
│   │ CopilotPanel (chat UI)           │ │  HTTP   │                          │
│   │   useCopilotAction(...)          │ ├────────▶│   POST /chat             │
│   │   ConfigContext (truth)          │ │         │     └─ Mastra agent      │
│   └──────────────────────────────────┘ │         │         tools:           │
│   ┌──────────────────────────────────┐ │         │           applyConfigPatch
│   │ Sidebar / Preview / Code (rendered │         │           explainOption  │
│   │ from ConfigContext — unchanged)  │ │         │   GET  /schema           │
│   └──────────────────────────────────┘ │         │   POST /healthz          │
└────────────────────────────────────────┘         └──────────────────────────┘
```

Single source of truth stays `ConfigContext`. The AI proposes patches; the playground applies them. Sidebar/preview/code update automatically because they already derive from config.

---

## 1. `apps/playground-ai/` (Mastra app)

A standalone Node app, separate from `packages/interactive-example`. Lives in `apps/` because it ships independently and is hosted separately.

> **Plan correction (2026-04-30):** Mastra ships its own Hono-based HTTP server out of the box (`mastra dev` / `mastra build`). Agents register with the `Mastra` constructor and are exposed automatically at `/api/agents/:agentId/{generate,stream,...}`. We use Mastra's server rather than a hand-rolled Hono setup, and add custom routes/middleware via Mastra's `server` config when we get to Phase 3.

### Structure (as scaffolded)

```
apps/playground-ai/
  package.json                     # @upup/playground-ai, private
  tsconfig.json
  .env.example
  .gitignore
  README.md
  src/
    mastra/
      index.ts                     # Mastra instance — registers playgroundAgent
      agents/
        playground-agent.ts        # Agent: instructions + tool wiring
      tools/
        applyConfigPatch.ts        # PRIMARY tool — returns validated Partial<UpupConfig>
      schema/
        upup-config.schema.ts      # zod schema + renderSchemaForPrompt() for the system prompt

# Phase 3 will add:
#   src/mastra/middleware/{auth,rate-limit,abuse}.ts
#   src/mastra/tools/explainOption.ts (read-only docs lookup)
```

### Mastra agent design

- **Model:** `claude-sonnet-4-6` (fast, cheap, plenty smart for this scope). Fall back to `claude-haiku-4-5` for cost control if traffic warrants.
- **System prompt:** static preamble (role, rules, output contract) + dynamic block injecting the *current* `UpupConfig` JSON and the documented schema. Re-rendered each turn.
- **Tools (only two):**
  - `applyConfigPatch({ patch: Partial<UpupConfig>, explanation: string })` — preferred path. Validated server-side against the schema before returning.
  - `explainOption({ optionId: string })` — read-only docs lookup; never mutates state.
- **No `replaceCode` tool.** Removing the escape hatch keeps the agent on rails.

### HTTP surface (provided by Mastra)

| Method | Path                                       | Purpose                                                          |
| ------ | ------------------------------------------ | ---------------------------------------------------------------- |
| POST   | `/api/agents/playground-agent/generate`    | One-shot completion; body: `{ messages: [...] }`                 |
| POST   | `/api/agents/playground-agent/stream`      | SSE stream of agent turns (text deltas + tool calls)             |
| GET    | `/api/agents`                              | Lists registered agents — handy for sanity checks                |
| GET    | `/api/openapi.json`                        | OpenAPI spec for all endpoints (auto-generated)                  |

Custom routes added in Phase 3 via Mastra's `server.routes`:

| Method | Path        | Purpose                                                 |
| ------ | ----------- | ------------------------------------------------------- |
| GET    | `/healthz`  | Liveness for the deployer                               |
| GET    | `/schema`   | Returns the canonical `UpupConfig` zod schema (cached)  |
| POST   | `/feedback` | (optional) thumbs up/down for prompt tuning             |

The playground sends `currentConfig` as a metadata field in the agent request so the system prompt can include it. Mastra's request-context API is the wiring point; details land with Phase 3.

### Schema as the contract

`@upup/shared` already exports `UpupConfig` types. Generate a JSON Schema (with `zod-to-json-schema` or hand-rolled) and ship it with the Mastra app. The agent's system prompt embeds:
- The full schema as the source of truth for what fields exist
- The current config so the agent reasons about deltas, not absolutes
- A short rubric: "prefer the smallest patch that achieves the user's intent; never invent fields not in the schema"

Validate every emitted patch against the schema *before* it leaves the server. Reject + reprompt if invalid.

---

## 2. Playground side: CopilotKit integration

### Component placement

```
packages/interactive-example/src/
  ai/
    CopilotPanel.tsx               # NEW — chat UI, mounts CopilotKit provider
    useUpupCopilot.ts              # NEW — wires useCopilotAction handlers to ConfigContext
    promptSeeds.ts                 # Suggested first messages ("images only, max 10MB", etc.)
  state/
    ConfigContext.tsx              # Existing — gains a setConfigPatch(patch) action
  InteractiveExample.tsx           # Mounts CopilotPanel as a collapsible right rail
```

### UX placement — full breakdown

The playground already has three primary surfaces: **left sidebar (config categories)**, **center preview (uploader)**, **bottom-or-tabbed code panel**. Adding a fourth surface (chat) without it feeling tacked-on is the central UX problem.

#### Why each obvious placement fails

| Placement | Why it doesn't work |
|---|---|
| **Right rail panel (always visible, ~360px)** | Crowds the preview at <1400px viewports. Forces a 4-column layout that feels cluttered. Users who don't want AI still pay the visual cost. |
| **Floating bubble (Intercom-style)** | Looks generic/SaaSy, undermines the "this is a serious dev tool" vibe. Easy to dismiss but also easy to miss. |
| **Inline above the sidebar** | Two config interfaces stacked vertically — they compete and confuse (which one is canonical?). |
| **Modal overlay** | Disruptive. Users lose the preview while typing. Breaks the live-feedback loop. |
| **Bottom drawer** | Conflicts with the code tab. Vertical space is already tight on laptops. |

#### Recommended: **collapsible right slide-over, dismissed by default**

- **Default state:** closed. A slim trigger button sits in the top-right corner of the playground with a subtle "✨ Ask AI" label and a one-time pulse animation on first visit.
- **Open state:** slides in from the right as a 400px panel that *overlays* (not pushes) the preview. The preview stays full-width; the panel sits on top with a soft backdrop tint on the preview side only — sidebar stays fully usable.
- **Why overlay > push:** pushing forces a layout reflow that re-mounts the preview iframe (can re-trigger uploads/state). Overlay keeps the preview alive and visible at the edge.
- **State persists in localStorage:** if the user opened it last session, default to open this session.
- **Close affordances:** Esc key, X button, click on the preview backdrop, or the same trigger button toggling.

#### First-visit onboarding

- Trigger button gets a 2s pulse + tiny "Try the AI assistant" tooltip on first load only
- Tooltip dismisses on any interaction
- Never auto-opens (respects user attention)

#### Inside the panel — layout

```
┌─ Ask AI ───────────── × ┐
│                          │  ← Header: title + close button
│  Hi 👋 I can configure   │
│  upup for you. Try:      │  ← Empty state with 3 preset prompts
│  • Photos only, 10MB max │
│  • Add cloud drives      │
│  • Make it dark mode     │
│                          │
│  ┌─────────────────────┐ │  ← Message thread (streams in)
│  │ User: photos only…  │ │
│  └─────────────────────┘ │
│  ┌─────────────────────┐ │
│  │ AI: I'll set…       │ │
│  │ ┌─ Applied ─────┐   │ │  ← Inline patch summary chip
│  │ │ images, 10MB  │   │ │     (clickable → highlights affected sidebar fields)
│  │ │ [Undo]        │   │ │
│  │ └───────────────┘   │ │
│  └─────────────────────┘ │
│                          │
│ ─────────────────────── │
│ [Type a message…]   [▶] │  ← Input pinned to bottom
└──────────────────────────┘
```

#### Visual feedback when patches apply

This is the most important UX detail — without it, the AI feels disconnected from the rest of the playground.

1. **Sidebar field highlight:** when the patch lands, the *specific* sidebar fields it touched briefly pulse with the brand accent color (1.2s ease-out). Users see exactly what changed.
2. **Code panel diff hint:** the regenerated code lines that differ from the previous render get a temporary green-tinted left border (3s).
3. **Preview shimmer:** the uploader preview gets a 200ms subtle scale-pulse so users notice it re-rendered.
4. **Patch summary chip in chat:** clickable; clicking it scrolls the sidebar to and re-pulses the affected fields. Includes an **Undo** button that reverts to the previous config snapshot (kept for the last 5 patches).
5. **Toast for off-screen changes:** if the user is scrolled away from the affected sidebar section, show a small bottom-left toast: *"Updated: Limits → maxFileSize"* with a Jump button.

#### Trust & transparency

- The agent **always explains in plain English** what it's about to do *before* the patch is shown as applied. Streaming text → patch chip → sidebar updates. Order matters.
- A "Show patch" disclosure under the chip reveals the raw JSON for power users
- The agent **cannot** apply a patch that touches >5 fields without first asking *"This will change quite a bit — apply?"* (renders inline confirmation buttons in the chat)

#### Mobile (≤640px)

- Trigger button moves to a floating action button bottom-right
- Tap → full-screen sheet (not a sidebar — there's no room)
- Sidebar collapses to a top accordion when AI is open
- Preview hidden behind a "View preview" tab to save vertical space
- Mobile is secondary; most playground users are on desktop. Make it functional, not gorgeous.

#### Discoverability without being naggy

- Trigger button always visible but unobtrusive
- One pulse on first visit, then never animated again
- No "Hey, try AI!" interruptions, no popovers, no onboarding tour
- Documented in the docs site once: a screenshot + one paragraph

#### Accessibility

- Trigger button: `aria-label="Open AI assistant"`, `aria-expanded` reflects state
- Panel: `role="dialog"`, `aria-modal="false"` (intentionally non-modal — sidebar still usable), focus trap *only* when input is focused
- Keyboard shortcut: `Cmd/Ctrl + K` toggles the panel (matches industry standard for AI chat in dev tools)
- All sidebar field highlights also fire `aria-live="polite"` announcements: *"Updated allowed file types to images"*
- Screen reader users get the full chat message + summary, not just visual chips
- Reduced-motion users: no pulse animations, just static highlight color for 2s

#### Three preset prompts (empty state)

Tuned to common newcomer intents — short, concrete, results visible in <2s:

1. **"Photos only, max 10MB"** — exercises `allowedFileTypes` + `maxFileSize`
2. **"Add Google Drive and Dropbox"** — exercises `sources`
3. **"Make it dark with rounded corners"** — exercises `theme`

These rotate per session so repeat visitors see variety.

#### What we are deliberately *not* building

- No avatars or AI personas (no "Meet Uppy the assistant")
- No emoji-heavy chat output
- No celebration animations on apply
- No streaming character-by-character "typing" effect beyond what CopilotKit gives by default
- No persistent multi-day chat history (session-scoped only, cleared on close)

The playground is a config tool, not a conversation app. The chat should feel like a power-user shortcut, not the centerpiece.

### `useCopilotAction` wiring

```ts
useCopilotAction({
  name: "applyConfigPatch",
  description: "Apply a partial UpupConfig patch to the live playground.",
  parameters: [{ name: "patch", type: "object" }, { name: "explanation", type: "string" }],
  handler: ({ patch, explanation }) => {
    ctx.setConfigPatch(patch)        // merges into ConfigContext
    return { applied: true, summary: explanation }
  },
})
```

`ConfigContext` already has `setConfig(full)`; add `setConfigPatch(partial)` that does `{ ...current, ...patch }` with deep-merge for nested keys (`theme`, `imageEditor`, `resumable`).

The CopilotKit `<CopilotChat>` component handles streaming, message history, and the action invocation lifecycle.

### What the user sees

1. Types: *"I want users to upload photos only, max 10MB, with retry"*
2. AI streams an explanation in chat
3. Sidebar toggles flip live (`allowedFileTypes: 'images'`, `maxFileSize: { size: 10, unit: 'MB' }`, `maxRetries: 3`)
4. Preview re-renders, code panel regenerates — all via the existing config-driven pipeline
5. Chat shows: *"Applied: images only, 10MB max, 3 retries. Anything else?"*

---

## 3. Auth + abuse prevention

The endpoint is public-facing and calls a paid LLM. Without protection it's a footgun.

### Layers

1. **Origin pinning** — `/chat` requires a signed origin token issued by the playground page on first load. Token is short-lived (15 min) and bound to the request origin. CORS locked to known playground domains.
2. **Rate limiting** — per-IP + per-session token bucket: 10 messages/min, 100/day. Stored in Upstash Redis or equivalent edge KV.
3. **Prompt firewall** — reject messages over 2KB, reject obvious prompt-injection attempts (basic regex on system-prompt-leak strings), strip any tool-call instructions from user input before sending to model.
4. **Output validator** — every `applyConfigPatch` is validated against the schema. Patches with extra/unknown keys are dropped + the agent gets a "your patch was invalid, try again" reply.
5. **Cost guard** — daily spend cap; over the cap, `/chat` returns a 503 with a friendly "AI assistant is taking a break" message. Email alert at 80% of cap.
6. **No PII in prompts** — playground state is config only. Nothing user-identifiable goes to the model. Document this explicitly.

### What's *not* done

- No user accounts (this is a public docs playground, not a product)
- No per-user quotas beyond IP-based rate limit
- No persistent chat history (session-only, never written to disk)

---

## 4. Deployment

### Hosting

**Recommended: Cloudflare Workers + KV + Durable Objects.**
- Mastra runs on Workers (Hono + edge runtime work fine)
- KV for the rate-limit buckets and signed-token cache
- Durable Objects for active chat sessions if we ever need stateful streaming
- Global edge → low latency from anywhere a docs visitor hits the playground

Alternative: **Fly.io** or **Render** if the Mastra version we use needs Node APIs not available on Workers. Pick at implementation time based on Mastra's edge-compat status.

### Env vars (`apps/playground-ai/.env.example`)

```
ANTHROPIC_API_KEY=
ALLOWED_ORIGINS=https://upup.dev,http://localhost:5173
ORIGIN_TOKEN_SECRET=                # HMAC key for signed tokens
RATE_LIMIT_REDIS_URL=               # Upstash or similar
DAILY_COST_CAP_USD=25
ALERT_WEBHOOK_URL=                  # Slack/Discord on cost-cap hit
LOG_LEVEL=info
```

### Latency budget

- p50: <1.2s first token (streaming starts)
- p95: <3s first token, <15s full response
- The model call dominates; aim to keep the agent system prompt under 4K tokens to avoid bloating cache misses.

### CI/CD

- Deploy on push to `main` via GitHub Actions
- Preview deploys per PR (Cloudflare Pages style) so we can review prompt changes against a live agent
- One-shot Anthropic eval in CI: 20 canned prompts → expected patches; fails the build if regression > 10%

### Observability

- Structured logs: session_id, message count, tool invocations, validation failures, cost
- Sentry for errors
- Dashboard: messages/day, cost/day, top-50 prompts, validation-failure rate

---

## 5. Phased delivery

### Phase 1 — Skeleton (3 days)
- `apps/playground-ai/` scaffolding, Hono server, `/healthz` only
- Mastra agent with `applyConfigPatch` tool, schema embedded, no validation yet
- Local dev: `pnpm --filter @upup/playground-ai dev` boots on localhost:3001
- Manual smoke test via curl

### Phase 2 — Playground wiring (3 days)
- CopilotPanel component, mounted in InteractiveExample as collapsible right rail
- `useUpupCopilot` hook wires the action to ConfigContext
- `setConfigPatch` deep-merge added to ConfigContext
- Preset prompts seeded
- E2E happy path: type prompt → see sidebar update

### Phase 3 — Hardening (3 days)
- Schema validation on returned patches
- Rate limiting + signed origin tokens
- Cost cap + alerting
- Eval suite of 20 canned prompts in CI

### Phase 4 — Deploy (2 days)
- Cloudflare Workers deploy
- Production env vars
- DNS, CORS lockdown
- Wire playground to production endpoint
- Monitor for a week before announcing

**Total: ~11 days of focused work.**

---

## Open questions

1. Mastra's edge-runtime story — confirm it boots on Cloudflare Workers cleanly, otherwise pivot to Fly.io.
2. Do we want the AI to be able to *suggest without applying* (e.g., "I think you want X, click to apply")? Adds a confirmation step but reduces "agent did something I didn't expect" friction. Default: no — auto-apply, with an undo button.
3. Chat history persistence across page reloads — yes, in localStorage, capped at last 20 messages.
4. Should the AI be able to apply *presets* (the existing `PresetsBar` items) directly? Probably yes — saves tokens. Add a tool `applyPreset({ id })`.

## Success criteria

- A user can type a paragraph describing their upload setup and the playground reflects it within 3 seconds
- Zero invalid patches escape to ConfigContext (100% validated)
- Daily cost stays under $25 in normal traffic
- p95 first-token latency < 3s
- After 30 days, ≥5% of playground sessions invoke the chat at least once (signal of usefulness)

If we hit those, the lean version was worth it. If not, kill the chat panel and move on — don't sunk-cost into Monaco/Sandpack.
