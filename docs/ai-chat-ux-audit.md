# AI chat UX audit (T-4083)

Audit of the two product AI chat surfaces against the AI chat UX brief
(2026-10-19). Line references are to `dev` at `fd99ff26`, before this branch.

The brief's four requirements:

1. A plain-word step trail for every tool call and data access. It is collapsed
   by default, expandable, and keyboard accessible.
2. Image uploads only where an image adds context. Where it doesn't, skip and
   say why.
3. Streamed text eases in instead of popping token by token. Under
   `prefers-reduced-motion` it appears instantly.
4. URLs, markdown links, code blocks, tables and list items are buffered and
   shown whole, never half-rendered.

Guardrails: no model changes, no new paid APIs, product UI only, keyboard-only
usable. `apps/mastra/src/lib/agent-model.ts` and any model selection, retry or
proxy wiring are out of scope.

## Surfaces

|           | (a) Playground assistant                                                                                                                          | (b) Docs Ask AI drawer                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| UI        | `packages/interactive-example/src/ai/AssistantPanel.tsx`, mounted by `InteractiveExample.tsx:175-183` on the landing homepage and framework pages | `apps/landing/src/components/docs/DocsAskAi.tsx`                           |
| Transport | `packages/interactive-example/src/ai/useMastraChat.ts` (`@mastra/client-js`)                                                                      | `apps/landing/src/lib/docs/use-docs-chat.ts` (plain `fetch` + SSE parsing) |
| Agent     | `playground-agent` (`apps/mastra/src/mastra/agents/playground-agent.ts`)                                                                          | `docs-agent` (`apps/mastra/src/mastra/agents/docs-agent.ts`)               |
| Tools     | `apply-config-patch` (`tools/applyConfigPatch.ts`)                                                                                                | `search-docs` (`tools/search-docs.ts`)                                     |

There is no landing API route in the Ask AI path. The drawer calls the Mastra
server directly at `NEXT_PUBLIC_MASTRA_BASE_URL` + `/api/agents/docs-agent/stream`,
with `/generate` as a fallback (`use-docs-chat.ts:142-231`).
`apps/landing/src/app/api/docs-search/route.ts` is the fumadocs search index
behind the `DocsSearch` dialog, not the AI.

## Today

### (a) Playground assistant

- **Transport is not streaming at all.** `useMastraChat.ts:159-173` calls
  `agent.generate()`, which returns the whole turn in one go. While that
  request is in flight the panel shows only a blinking `▍` cursor
  (`AssistantPanel.tsx:265-267`), then the full answer appears at once.
- **Item 1 (step trail): absent.** Tool results are read after the fact, only
  to pull out config patches (`useMastraChat.ts:185-213`). The only trace of
  tool use is the "Applied: <explanation>" chip once the turn has finished
  (`AssistantPanel.tsx:269-273`). Nothing says what is happening while the
  agent works.
- **Item 3 (ease-in): not applicable today, because nothing streams.** The
  whole answer pops in at once.
- **Item 4 (whole units): no markdown rendering.** `AssistantPanel.tsx:263-264`
  renders `{m.text}` as one raw text node under `white-space: pre-wrap`
  (`styles.css:1577-1581`), so `**bold**`, `` `code` ``, links, fences and
  tables all show as literal syntax, even in a finished turn.
- **Keyboard.** The composer, seeds, Clear, thumbs and comment controls are
  native buttons and textareas, so they are keyboard reachable. There is no
  focusable content inside answers.

### (b) Docs Ask AI drawer

- **Transport streams.** `use-docs-chat.ts:165-216` reads the SSE body and
  appends every `text-delta` to the message (`:203-207`). Each delta triggers
  a re-render of the whole string.
- **Item 1 (step trail): absent, and the data is thrown away.**
  `extractTextDeltas` (`use-docs-chat.ts:42-61`) keeps only `text-delta`
  events. The comment at `:26-41` documents the `tool-call` / `tool-result`
  events the stream already carries, but all of them are discarded. The user
  sees a bouncing typing indicator (`DocsAskAi.tsx:653-669`) for the whole
  search phase.
- **Item 3 (ease-in): absent.** Tokens pop in as they arrive. The streaming
  caret (`DocsAskAi.tsx:300-307`) already respects reduced motion
  (`motion-safe:animate-pulse`), but there is no ease on the text itself.
- **Item 4 (whole units): partially broken while streaming.** `MessageBody`
  (`DocsAskAi.tsx:42-68`) re-parses the growing string on every delta:
    - Fences are split with `/(```[\s\S]*?```)/` (`:43`), so an open fence
      renders as raw text, with the backticks visible, until the closing fence
      arrives. The whole block then snaps into a `<pre>`.
    - Links use `/\[[^\]]+\]\([^)]+\)|https?:\/\/\S+/` (`:177`). A half-arrived
      markdown link shows as raw `[link te` text. A half-arrived bare URL _does_
      match `https?:\/\/\S+`, so it renders as a **clickable link to a truncated
      URL** (for example `https://useupup.com/do`) until the rest arrives.
    - List items are parsed per line (`parseBlocks`, `:81-111`), so a list item
      grows character by character, and a line that is only `-` or `1.` flips
      between paragraph and list.
    - Tables are not supported, so they render as raw pipe text even when
      finished.
    - Bold is split on `**…**` (`:159`), so an open `**` shows literally until it
      closes.
- **Keyboard.** The drawer is non-modal with focus return
  (`DocsAskAi.tsx:324-341`), and Escape closes it (`:391-396`). Code blocks
  have a copy button, but the `<pre>` overflow is not focusable, so a long
  code line cannot be scrolled with the keyboard.

## What the stream already exposes for tool calls

Both surfaces use the same Mastra 1.x agent stream. Over the wire
(`/api/agents/<id>/stream`, `text/event-stream`, one `data: {json}` per event)
and through `@mastra/client-js`'s `processDataStream({ onChunk })`, the chunks
are typed records:

| Chunk `type`                                          | Payload used                                                    | Available for                                                                                  |
| ----------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `tool-call-input-streaming-start` / `tool-call-delta` | `toolCallId`, `toolName`, `argsTextDelta`                       | a "preparing…" state before the args are complete                                              |
| `tool-call`                                           | `toolCallId`, `toolName`, `args` (complete)                     | the step label, e.g. `args.query` for search-docs, or `args.patch` keys for apply-config-patch |
| `tool-result`                                         | `toolCallId`, `toolName`, `result` (plus `isError` on failures) | step done; search-docs `result.results[].{title,url}` gives the pages read                     |
| `tool-error`                                          | `toolCallId`, `toolName`, `error`                               | step failed                                                                                    |
| `text-delta`                                          | `text`                                                          | answer text                                                                                    |
| `error` / `finish` / `step-start` / `step-finish`     | lifecycle                                                       | turn status                                                                                    |

That is enough for a plain-word trail with **no `apps/mastra` change**:

- `search-docs`: "Searching the docs for 'presigned URLs'" on `tool-call`
  (`args.query`). On `tool-result`, "Reading /docs/server-mode/" for each
  returned `results[].url`, or "Docs search is unavailable" when
  `result.error` is set (`search-docs.ts:245-250`). The tool itself fetches
  `${DOCS_BASE_URL}/docs/llms-full.txt` (`search-docs.ts:205`). That fetch is
  the data access, and the trail can name it ("Loading the docs index") when
  the call is the first in the turn.
- `apply-config-patch`: "Updating the uploader config: allowedFileTypes,
  maxFileSize" on `tool-call` (`Object.keys(args.patch)`), then
  `result.explanation` on `tool-result`. The tool does no I/O. The schema
  validation (`inputSchema`) _is_ the step, and a validation failure arrives
  as `tool-error`.

The Mastra tool `description`s are written for the model, not for people, so
labels belong in the UI, keyed by tool id, with a generic
"Running <tool-id>" fallback for unknown tools.

## Do the models accept images?

Neither surface pins a model. Both agents use `agentModel(env)` and
`agentDefaultOptions(env)` (read, not changed):

- `apps/mastra/src/lib/env.ts:10-11, 38-42`: `OPENROUTER_MODEL` defaults to
  `anthropic/claude-haiku-4.5` on OpenRouter. That model accepts image input.
- `deploy/site/docker-compose.yml:84-87` and `deploy/site/README.md:116-117`:
  a deploy may set `OPENROUTER_API_URL=https://proxyai.devino.ca/v1` with a
  proxy model id (the README's example is `glm-5.3`). The proxy's free models
  are reasoning text models, and image input is not guaranteed.
  `agent-model.ts:7-12` exists to tune exactly that path, and it is out of
  scope here.
- `.github/workflows/nightly.yml:234-235, 532-533`: CI evals take both values
  from repo variables, so the model can change without a code change.

So whether images reach a vision-capable model is a deploy-time accident, not
a property of the code.

## Item 2 verdict: no image uploads on either surface

**(a) Playground assistant: skip.** The agent's only output is a
`Partial<UpupConfig>` patch over a text schema (`playground-agent.ts:20-55`).
Every field it can set (file types, size limits, sources, theme mode, server
URL) is named in a sentence faster than it can be screenshotted, and nothing
in the schema can be read off an image reliably, not even theme colours. A
paperclip in this panel would also sit next to a file uploader preview, which
invites people to drop their real files into the chat. On top of that, the
playground has no non-public storage of its own for chat attachments, and the
model may not accept images (see above). An image adds no context here.

**(b) Docs Ask AI: skip.** Answers are grounded only in text retrieval:
`search-docs` takes a text `query` and ranks `llms-full.txt` chunks
(`search-docs.ts:211-253`). An image, for example a screenshot of an error,
cannot be searched. The agent would have to transcribe it first, and that only
works if the deploy's model accepts images, which is not guaranteed. Pasting
the error text gets a better answer. The landing app has no non-public storage
path for chat uploads either. The useful version of this, "paste a screenshot
of your error", should wait until the docs agent pins a vision-capable model,
which is a model-selection decision outside this lane.

The panels say this in their own copy only if someone asks. No attachment
affordance is shown, so there is nothing to explain in the UI. The reason is
recorded here and in the PR.

## Playground implementation (this branch)

1. **Real streaming.** `useMastraChat` switches from `generate()` to
   `agent.stream()` + `processDataStream`. `text-delta` grows the turn.
   Each `apply-config-patch` `tool-result` is applied the moment it arrives,
   deduped by `toolCallId`, so the preview updates before the closing sentence
   lands. An `error` chunk becomes the existing honest "unavailable" turn. The
   run-id supersession, which drops a stale turn after `reset()`, now guards
   every chunk. `@mastra/client-js` 1.52 accepts `abortSignal` on `stream()`,
   so `reset()` and unmount also abort the request.
2. **Whole-unit buffer** (`src/ai/markdownStream.ts`). A small pure module with
   one grammar shared by the renderer and the buffer:
   `stableMarkdownPrefix(text)` returns the longest prefix holding only whole
   units:
    - fences are held until their closing line is complete;
    - a table is held until its delimiter row is complete, then grows a whole
      row at a time;
    - list items and headings are held until their line ends;
    - paragraph text is released word by word, but never inside an open
      `` `code` ``, `**bold**` or `[label](url)`, or a bare URL that has not
      hit whitespace yet;
    - a partial line that could still become a block (`-`, `1.`, `|`, `#`,
      a backtick) is held.

    Tests split every fixture at every index and assert three things: the
    shown text is a prefix of what was received; it never shrinks; and its
    parse is a structural prefix of the full parse (every rendered unit is
    identical to the final one). A component test streams random chunkings
    through `MarkdownMessage` and asserts the final DOM is byte-identical to
    the unchunked render.

3. **Ease-in** (`src/ai/MarkdownMessage.tsx` + `styles.css`). Every word,
   inline unit, list item, table row and code block is its own element, keyed
   by source offset. Because the buffer only ever renders whole units, each
   element mounts once, complete, and a CSS mount animation eases it in: a
   180 ms opacity fade for inline units, and a 200 ms opacity plus 4 px
   `translateY` for blocks. Elements already on screen keep their identity and
   never replay. There are no timers or JS animation, and
   `prefers-reduced-motion: reduce` sets `animation: none`, so text appears
   instantly. Links only become anchors for `http:`, `https:` and `mailto:`.
   Wide code and tables scroll inside a focusable (`tabindex="0"`), labelled
   region so the keyboard can reach them.
4. **Step trail** (a follow-up PR, stacked). It collects `tool-call` /
   `tool-result` / `tool-error` chunks into plain-word steps on the turn. It
   is rendered as a disclosure button (`aria-expanded`, `aria-controls`),
   collapsed by default, whose label is the current step while running, plus
   an ordered list of steps with done/failed state.

## Ask AI implementation plan (later, after the motion PR releases `DocsAskAi.tsx`)

`DocsAskAi.tsx`, `DocsChrome.tsx` and `DocsSearch.tsx` are owned by the open
motion PR, so nothing here edits them yet. The plan reuses the playground
pieces rather than re-deriving them:

1. **Share the buffer.** Copy `markdownStream.ts` and its tests into
   `apps/landing/src/lib/docs/` as a sibling helper. Landing does not depend on
   `@useupup/interactive-example`'s internals, and principle 4 favours a
   parallel copy over a cross-app import. Pin both copies to the same fixture
   suite. This helper file can land before the motion PR merges, because
   nothing imports it yet.
2. **Transport** (`use-docs-chat.ts`, not owned by the motion PR). Extend
   `extractTextDeltas` into an event reducer that also records `tool-call` /
   `tool-result` / `tool-error` into `DocsChatMessage.steps`:
    - "Searching the docs for '<args.query>'";
    - "Reading <path>" for each `results[].url` (origin stripped, matching
      the agent's own citation rule);
    - "Docs search is unavailable" on `result.error`.

    The `/generate` fallback gets the same steps from `response.steps[].toolResults`.

3. **Renderer** (`DocsAskAi.tsx`, after the motion PR). Replace
   `MessageBody`'s per-delta re-parse with
   `parseMarkdown(streaming ? stableMarkdownPrefix(content) : content)`.
   Keep the existing XSS posture: no innerHTML, plus the `renderLink`
   internal/external/inert rules (`:193-240`), which also fix the
   truncated-bare-URL link. Add tables. Keep `CodeBlock`'s copy button, and
   make its `<pre>` focusable.
4. **Ease-in.** Use the same per-unit keyed elements with Tailwind
   `motion-safe:` mount animations (opacity, plus translate for blocks,
   150-250 ms) so reduced motion is instant without a separate rule. Align the
   duration and easing tokens with whatever the motion PR lands, rather than
   inventing new ones.
5. **Step trail.** A disclosure under the assistant bubble, the same pattern as
   the playground, replacing the bare typing indicator during the search
   phase. Its collapsed label is the live step ("Searching the docs for
   'resumable uploads'"), so the drawer says what it is doing without being
   expanded.
6. **Tests.** Port the split-at-every-index fixtures, add an SSE-replay test
   for the reducer (tool events produce the right steps, and a `text-delta`
   split mid-link is never shown half), and extend
   `apps/e2e-test` `docs.spec.ts`, whose mocked agent route can replay a
   scripted SSE body with tool events.
7. **Images.** Not planned (see the verdict above). Revisit only if the docs
   agent pins a vision-capable model.
