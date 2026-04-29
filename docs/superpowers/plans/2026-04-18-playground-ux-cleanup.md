# Playground UX cleanup — competitor-informed plan

**Date:** 2026-04-18
**Branch:** v2-clean
**Kicked off by:** user feedback "the playground is messy … by default have the right keys there … lay out all of its ENUMs"

---

## 1. What competitors actually do

Checked live: Uppy 5.0 examples page, FilePond site playground, UploadThing
(playground URL retired — they now rely on docs + dashboard).

### Uppy examples (uppy.io/examples)

- **Left rail = flat checkbox panel**, grouped by semantic label
  ("Remote sources", "Local sources", "Dashboard", "Miscellaneous").
- Every option is a **checkbox**, not a dropdown. All options are visible at
  a glance. Only `Locale` (a long list) uses a `<select>`.
- **Zero text inputs, zero credentials.** Every source works by default.
  Google Drive, Dropbox, Box etc. are pre-wired against Transloadit's demo
  Companion instance.
- Preview sits to the **right of the sidebar**, always on screen.
- Heading offers two deep links: `Docs` and `StackBlitz` (for the code).

### FilePond playground (pqina.nl/filepond)

- **No interactive config at all.** The "playground" is a marketing page
  with fixed demo scenarios ("Multi-file demo", "Profile picture demo")
  each with a hard-coded code snippet below it.
- Lesson: if you can't make interactivity easy, fixed scenarios beat a
  broken "fill-in-your-own-endpoint" demo.

### UploadThing

- **Removed their playground** entirely. `/playground` now 404s. They point
  users to the docs and the authenticated dashboard instead.
- Implied lesson: interactive playgrounds are hard to maintain and worth
  only if they answer "what does this feel like?" in under 10 seconds.

---

## 2. What we do today that breaks all three lessons

Source of truth in `packages/interactive-example/src/categories/*.ts`.
Evidence in `docs/superpowers/audits/ours-current.png`.

1. **First category a user sees is "Upload", which front-loads five empty
   text inputs:** `tokenEndpoint`, `serverUrl`, `apiKey`, `uploadEndpoint`,
   `maxConcurrentUploads`. Placeholder hints like `/api/upload-token`
   suggest the demo won't work until the user wires up a backend — exactly
   the opposite of what a playground should signal.
2. **Provider enum renders as a `<select>` showing `—`.** All five options
   (s3/backblaze/azure/digitalocean/aws) are hidden. Same problem for
   `theme.mode`, `resumable.mode`, `editor.display`.
3. **Legacy v1 fields share the same visual weight as v2 fields.**
   `dark`, `classNames.*`, `limit`, `shouldCompress` live inline with
   `theme.mode`, `theme.slots`, `maxFiles`. A newcomer can't tell which
   API to adopt.
4. **Full-page scroll.** Nine categories expanded at once produce a rail
   that's ~3000 px tall; the preview stays pinned but half the viewport
   is whitespace while the user scrolls the sidebar.
5. **Nothing works by default.** Open the playground, click "My Device",
   choose a file — nothing uploads because provider is `—` and every
   endpoint field is empty. Every visitor experiences this.

---

## 3. Proposed changes (ordered by impact)

### Tier 1 — make the demo work out of the box

**3.1 Pre-seed a managed-mode profile.**
- Ship a hosted "managed demo" endpoint (or Cloudflare Worker) that accepts
  any file, returns a fake-success response, and logs to a ring buffer.
  The playground hits it by default; the uploader "just works" on load.
- Hide `tokenEndpoint`, `serverUrl`, `apiKey`, `uploadEndpoint`,
  `cloudDrives.*.clientId` behind a new **"Advanced — self-host"** category
  that starts collapsed. Label it plainly: *"Only needed if you run your
  own backend — the demo above works without this."*
- Pick a sane provider default. `provider: 's3'` is fine as the baseline;
  show the pill as selected rather than `—`.

**3.2 Replace enum `<select>` with segmented/radio-card controls** for any
enum with ≤ 6 options. Rough mapping:
- `provider` (5) → segmented
- `theme.mode` (3) → segmented
- `resumable.mode` (2) → segmented
- `editor.display` (2) → segmented
- `maxFileSize.unit` / `minFileSize.unit` (4) → segmented
- `language` (long list) → keep as `<select>`, same as Uppy's locale picker

Add a new `primitive: 'segmented'` or reuse `'enum'` with an
`options.layout: 'segmented'` flag in the entry definition. Render it in
`src/sidebar/primitives/EnumSelect.tsx` behind an `if (layout ===
'segmented')` branch so existing tests keep passing.

### Tier 2 — taming the sidebar

**3.3 Group legacy v1 into a collapsed "Legacy (v1 compat)" section.**
Move these there, away from the v2 defaults:
- `appearance.dark`, `appearance.classNames.*`
- `limits.limit` (already marked legacy, but still shown next to `maxFiles`)
- `behavior.shouldCompress` if still present
- Any other `description: "Deprecated — …"` entries

**3.4 Collapse most categories by default.** Start with only `Upload`
(minimal fields) and `Appearance` (theme toggle) open. Others collapse
until the user clicks. Uppy does this implicitly because their rail is
short; we need it explicit because we have 24+ event props alone.

**3.5 Presets row at the top.** One-click configurations:
- **"Basic image upload"** — maxFiles=10, accept=`image/*`
- **"Large file (multipart)"** — resumable.mode=multipart
- **"Cloud sources"** — Dropbox + Drive + OneDrive enabled
- **"Image editor"** — editor.enabled, editor.display=modal

A preset writes a config snapshot into `ConfigContext` via the same path
as URL deserialisation (`src/state/deserialize.ts`), so nothing about the
underlying state model changes.

### Tier 3 — nice-to-have polish

**3.6 Event log panel.** When `events.*` toggles are on, show a live
`console`-style panel below the preview listing fired events. Closes the
"how do I know what `onFileClick` actually gives me" gap without opening
devtools.

**3.7 Docs links per entry.** Use the existing `docsLink?` field in
`ToggleEntry` (it's already in the type, nothing uses it) and render a
small `?` next to each label linking to the relevant docs anchor.

---

## 4. What NOT to do

- Don't rebuild the primitive layer. `BoolToggle`, `NumberInput`,
  `EnumSelect`, `StringInput`, `NestedConfig` are all tested
  (`src/tests/*.test.tsx`) and shouldn't be rewritten just to add a
  segmented-control variant — extend `EnumSelect` instead.
- Don't remove the event toggles wholesale. The user previously said they
  wanted *every* feature visible; collapsed categories solve the
  overwhelm without removing features.
- Don't ship a real managed backend this sprint — a no-op success endpoint
  is enough. "Serverless demo" is a separate decision.

---

## 5. Suggested order for a half-day session

1. **3.1** managed-mode default + Advanced collapse (the biggest signal
   fix; everything else is cosmetic until new visitors see something work).
2. **3.2** segmented enum variant.
3. **3.3 + 3.4** legacy group + collapse-by-default.
4. **3.5** presets row.
5. Tier 3 if time permits, otherwise queue.

Everything in 3.1–3.4 lives inside `packages/interactive-example/src/`
and needs no changes to `@upup/react` or `@upup/core`.

---

## Appendix — audit screenshots

- `docs/superpowers/audits/competitor-uppy-examples.png`
- `docs/superpowers/audits/competitor-filepond.png`
- `docs/superpowers/audits/competitor-uploadthing-landing.png`
- `docs/superpowers/audits/ours-current.png`
- `docs/superpowers/audits/ours-current-viewport.png`
