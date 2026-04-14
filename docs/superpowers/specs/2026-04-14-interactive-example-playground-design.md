# Interactive Example & Playground — Design Spec

**Date:** 2026-04-14
**Branch target:** `v2-clean`
**Status:** Approved design, ready for implementation planning

---

## 1. Goal

Replace the duplicated `HomepageDemo` component currently maintained separately in `apps/landing` and `apps/playground` with a single shared `<InteractiveExample />` component that:

1. Exposes **every `UpupUploader` prop** and relevant `useUpupUpload` hook features as interactive toggles
2. Shows a **live preview** of the uploader alongside **generated JSX code** that reflects the current config
3. Serializes state to a **shareable URL permalink**
4. Supports **focused embeds** so docs pages can show only the toggles relevant to that page
5. Preserves the **current landing-page visual design** for its embedded demo

**Why now:** v2 added ~40 new props, a new theme system, a new i18n system, strategy variants, and hook features — none of which are exposed in either demo. The duplication means changes have to land in two places and have already diverged. Consolidating is also the precondition for later docs embeds and AI/IDE integration work.

---

## 2. Non-Goals

These are explicitly out of scope for this plan. Each may be addressed in a separate plan later.

- **AI / IDE deep-links** — "Open in Claude Code / Cursor / StackBlitz / CodeSandbox" buttons. Discussed during brainstorming; deferred because they require repo-native prompt/skill/agent files and deep-link URL shape research that is big enough for its own plan.
- **Repo-native AI context files** — `.github/prompts/try-upup.prompt.md`, `.claude/skills/upup-explorer/SKILL.md`, etc. Deferred with the above.
- **Publishing the package to npm** — `packages/interactive-example` is workspace-internal, `private: true`. There are no external consumer use cases identified.
- **Docs pages embedding the component** — the `<InteractiveExample focus={[...]} />` API is built and tested as part of this plan, but actually wiring it into specific Docusaurus pages is a follow-up for the docs team.
- **Redesigning the landing-page hero** — this plan preserves the current visual design. Any visual refresh is a separate concern.
- **Comprehensive e2e across every toggle combination** — unit tests verify each primitive; a small set of representative e2e scenarios may be added, but full combinatorial coverage is not a goal.
- **Pixel-perfect playground polish** — the playground gets the full experience with all sidebar categories expanded; aesthetic polish beyond "looks professional" is out of scope.

---

## 3. Architecture

### 3.1 New workspace package

**Path:** `packages/interactive-example`

**`package.json`:**
```json
{
  "name": "@upup/interactive-example",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "dependencies": {
    "@upup/react": "workspace:*",
    "@upup/shared": "workspace:*",
    "clsx": "^2.1.1",
    "lucide-react": "^0.503.0",
    "pako": "^2.1.0"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.1",
    "@types/pako": "^2.0.4",
    "@types/react": ">=18.0.0",
    "vitest": "^4.1.2"
  }
}
```

The package is consumed as source (no build step) — its `exports` point at `./src/index.ts` directly. Next.js consumers already transpile workspace packages.

### 3.2 File structure

```
packages/interactive-example/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                         # public exports
│   ├── InteractiveExample.tsx           # top-level component
│   ├── types.ts                         # CategoryId, PropId, ToggleEntry, etc.
│   ├── state/
│   │   ├── ConfigContext.tsx            # React context — shared config store
│   │   ├── useConfig.ts                 # hook: read/write one prop
│   │   ├── serialize.ts                 # config → base64url token
│   │   ├── deserialize.ts               # token → config
│   │   └── url-sync.ts                  # debounced history.replaceState
│   ├── sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── CategorySection.tsx
│   │   └── primitives/
│   │       ├── BoolToggle.tsx
│   │       ├── NumberInput.tsx
│   │       ├── EnumSelect.tsx
│   │       ├── MultiSelect.tsx
│   │       ├── StringInput.tsx
│   │       ├── NestedConfig.tsx         # for cloudDrives.*, theme.slots, i18n.*
│   │       └── index.ts
│   ├── preview/
│   │   └── UploaderPreview.tsx          # wraps <UpupUploader config={...}/>
│   ├── code/
│   │   ├── CodeTab.tsx                  # renders generated JSX + Copy button
│   │   ├── generateCode.ts              # pure fn: config → string
│   │   └── tests/generateCode.test.ts
│   ├── categories/                      # manifest per category
│   │   ├── upload.ts
│   │   ├── sources.ts
│   │   ├── limits.ts
│   │   ├── processing.ts
│   │   ├── editor.ts
│   │   ├── behavior.ts
│   │   ├── appearance.ts
│   │   ├── language.ts
│   │   ├── events.ts
│   │   └── index.ts                     # aggregates all categories
│   └── tests/
│       ├── InteractiveExample.test.tsx  # integration: mount, interact, verify
│       ├── serialize.test.ts            # round-trip fidelity
│       └── categories.test.ts           # manifest integrity
```

### 3.3 Consumer changes

**`apps/landing/src/app/page.tsx`** currently imports `HomepageDemo from "@/components/HomepageDemo"`. After this plan:

```tsx
import { InteractiveExample } from '@upup/interactive-example'
// ...
<InteractiveExample
  defaultExpanded={['settings', 'themes', 'sources', 'options', 'language']}
  showCodeTab={false}
/>
```

The local `apps/landing/src/components/HomepageDemo/` is **deleted**.

**`apps/playground/src/app/page.tsx`** currently imports `HomepageDemo from "@/components/HomepageDemo"`. After this plan:

```tsx
import { InteractiveExample } from '@upup/interactive-example'
// ...
<InteractiveExample />
```

The local `apps/playground/src/components/HomepageDemo/` is **deleted**. `apps/playground/src/components/Uploader.tsx` is also deleted (it's a 135-line wrapper around `<UpupUploader>` that the new component replaces).

---

## 4. Component API

```ts
// packages/interactive-example/src/types.ts

export type CategoryId =
  | 'upload' | 'sources' | 'limits' | 'processing' | 'editor'
  | 'behavior' | 'appearance' | 'language' | 'events'

export type PropId = string  // keys of UpupUploaderProps or dotted paths
                             // like "cloudDrives.googleDrive.clientId"

export type InteractiveExampleProps = {
  /** Which sidebar sections start open. Default: []. */
  defaultExpanded?: CategoryId[]

  /** Show the Code tab next to Preview. Default: true. */
  showCodeTab?: boolean

  /** When set, the sidebar shell is hidden and only these specific toggles
   *  render inline next to the preview. Used by docs embeds. */
  focus?: PropId[]

  /** Initial config overrides beyond what's decoded from the URL. */
  initialConfig?: Partial<UpupUploaderProps>

  /** Preview pane width. Default: "auto". */
  previewWidth?: number | 'auto'

  /** Disable URL sync. Default: false (sync enabled). */
  disableUrlSync?: boolean
}
```

**Exports from `packages/interactive-example/src/index.ts`:**

- `InteractiveExample` (default export + named)
- Toggle primitives (for advanced consumers): `BoolToggle`, `NumberInput`, `EnumSelect`, `MultiSelect`, `StringInput`, `NestedConfig`
- `useConfig()` hook (for consumers rendering outside the default layout)
- `ConfigProvider` context provider
- Types: `InteractiveExampleProps`, `CategoryId`, `PropId`, `UpupUploaderProps`

---

## 5. URL state serialization

**Format:** `?c=<base64url-encoded-gzipped-json>`

**Rules:**
1. **Only non-default props serialize.** Default config is the empty object `{}`; a prop that equals its `UpupUploader` default is stripped before encoding.
2. **Encoding pipeline:** `config → JSON.stringify → pako.deflate → base64url`. Gzip is worth the 20-line dependency because most configs are sparse and benefit from compression; base64url is chosen over base64 to avoid URL-unsafe characters.
3. **Decoding:** reverse the pipeline. If decoding fails (malformed token, changed schema), fall back silently to the default config and emit a `console.warn`.
4. **Write strategy:** on every config change, debounce 250ms then `history.replaceState(null, '', '?c=<token>')`. Never push history entries (back-button should not cycle through toggle states).
5. **Read strategy:** on mount only. Subsequent external URL changes (e.g. via browser nav) are not picked up unless the component remounts.
6. **Empty-config special case:** when the current config matches the default, remove `?c=` from the URL instead of emitting an empty token.

**Schema evolution:** the decoded JSON is validated against `UpupUploaderProps` via a simple filter (drop keys that don't exist on the current type). No formal migration; if a permalink encodes a prop that has since been removed from upup, that one prop is silently dropped.

---

## 6. Category manifest

Each category is a file in `src/categories/` that exports an array of `ToggleEntry` objects:

```ts
export type ToggleEntry = {
  id: PropId
  label: string
  description?: string
  primitive: 'bool' | 'number' | 'enum' | 'multi' | 'string' | 'nested'
  defaultValue: unknown
  /** Props specific to each primitive (enum.options, number.min/max, etc.) */
  options?: Record<string, unknown>
  /** Optional link to docs page. */
  docsLink?: string
}
```

The 9 categories with their toggle entries:

### 6.1 `upload` — Upload strategy & execution

| Prop | Primitive | Default |
|---|---|---|
| `provider` | enum (`s3` \| `backblaze` \| `azure` \| `digitalocean` \| `aws`) | `'s3'` |
| `tokenEndpoint` | string | `''` |
| `serverUrl` | string | `''` |
| `apiKey` | string | `''` |
| `uploadEndpoint` | string | `''` |
| `maxConcurrentUploads` | number (1–10) | `3` |
| `maxRetries` | number (0–10) | `3` |
| `resumable` | nested (enabled, chunkSize) | `undefined` |
| `autoUpload` | bool | `false` |
| `crashRecovery` | bool | `false` |

### 6.2 `sources` — Which adapters are enabled

| Prop | Primitive | Default |
|---|---|---|
| `sources` | multi-select (local, google_drive, onedrive, dropbox, box, url, camera, microphone, screen) | all |
| `cloudDrives.googleDrive` | nested (clientId, apiKey, appId) | `undefined` |
| `cloudDrives.oneDrive` | nested (clientId) | `undefined` |
| `cloudDrives.dropbox` | nested (clientId) | `undefined` |
| `cloudDrives.box` | nested (clientId) | `undefined` |
| `showSelectFolderButton` | bool | `false` |

### 6.3 `limits` — File validation

| Prop | Primitive | Default |
|---|---|---|
| `accept` | string | `'*'` |
| `limit` | number (1–100) | `10` |
| `maxFileSize` | nested (size, unit) | `{size: 100, unit: 'MB'}` |
| `minFileSize` | nested (size, unit) | `undefined` |
| `maxTotalFileSize` | nested (size, unit) | `undefined` |

### 6.4 `processing` — File pipeline

| Prop | Primitive | Default |
|---|---|---|
| `shouldCompress` | bool | `false` |
| `imageCompression` | bool | `false` |
| `thumbnailGenerator` | bool | `false` |
| `checksumVerification` | bool | `false` |
| `heicConversion` | bool | `false` |
| `stripExifData` | bool | `false` |
| `contentDeduplication` | bool | `false` |

### 6.5 `editor` — Image editor

| Prop | Primitive | Default |
|---|---|---|
| `imageEditor.enabled` | bool | `false` |
| `imageEditor.display` | enum (`inline` \| `modal`) | `'inline'` |
| `imageEditor.autoOpen` | enum (`never` \| `single` \| `always`) | `'never'` |
| `imageEditor.tabs` | multi-select | `[]` |
| `imageEditor.tools` | multi-select | `[]` |
| `imageEditor.output.mimeType` | enum | `undefined` |
| `imageEditor.output.quality` | number (0–1) | `undefined` |

### 6.6 `behavior` — UX

| Prop | Primitive | Default |
|---|---|---|
| `mini` | bool | `false` |
| `enablePaste` | bool | `false` |
| `allowFolderUpload` | bool | `false` |
| `disableDragDrop` | bool | `false` |
| `allowPreview` | bool | `true` |
| `showBranding` | bool | `true` |
| `isProcessing` | bool | `false` |

### 6.7 `appearance` — Theme & styling

| Prop | Primitive | Default |
|---|---|---|
| `theme.mode` | enum (`light` \| `dark` \| `system`) | `'system'` |
| `theme.tokens.color.primary` | string (color picker) | `undefined` |
| `theme.slots` | nested (6–8 commonly-overridden paths: fileList.uploadButton, fileList.root, filePreview.deleteButton, progressBar.fill, adapterSelector.adapterButton, mainBox.root, adapterView.header, urlUploader.fetchButton) | `undefined` |
| `className` | string | `undefined` |

### 6.8 `language` — i18n

| Prop | Primitive | Default |
|---|---|---|
| `i18n.bundle` | enum (en_US, ar_SA, de_DE, es_ES, fr_FR, ja_JP, ko_KR, zh_CN, zh_TW) | `'en_US'` |
| `i18n.fallbackLocale` | enum | `undefined` |
| `i18n.overrides` | nested (subset of common keys) | `undefined` |

### 6.9 `events` — Callbacks (log toggles)

| Prop | Primitive | Default |
|---|---|---|
| `onFilesSelected` | bool (toggles a console.log handler) | `false` |
| `onFileUploadStart` | bool | `false` |
| `onFileUploadComplete` | bool | `false` |
| `onFilesUploadComplete` | bool | `false` |
| `onError` | bool | `false` |
| `onWarn` | bool | `false` |
| `onRetry` | bool | `false` |
| `onRestrictionFailed` | bool | `false` |
| `onFileTypeMismatch` | bool | `false` |
| `onFileAdded` | bool | `false` |
| `onFileRemoved` | bool | `false` |
| `onUploadProgress` | bool | `false` |

When enabled, each event toggle wires a handler that both logs to the browser console **and** pushes a `react-toastify` toast so users can verify the event fires without opening devtools.

---

## 7. Code generation

**Pure function:** `generateCode(config: Partial<UpupUploaderProps>, options?: { format?: 'jsx' }): string`

**Rules:**
- Only non-default props appear in the output.
- Imports are always included: `import { UpupUploader } from '@upup/react'` + `import '@upup/react/styles'`.
- The output is a complete copyable React component (`export default function App() { return (...) }`) so a user can paste it into any React project and have it work.
- Boolean-true shorthand: emit `resumable` not `resumable={true}`.
- Strings: double-quoted.
- Numbers: `{n}` form.
- Object props (cloudDrives, theme.slots, i18n.overrides): pretty-printed JSON at 2-space indent inside `{{ ... }}`.
- Event handlers: emit `onX={(arg) => console.log('onX', arg)}` so users can see the shape.

**Output example** for a config with `provider: 'backblaze'`, `serverUrl: '/api/upup'`, `maxConcurrentUploads: 3`, `resumable: true`, `imageCompression: true`:

```tsx
import { UpupUploader } from '@upup/react'
import '@upup/react/styles'

export default function App() {
  return (
    <UpupUploader
      provider="backblaze"
      serverUrl="/api/upup"
      maxConcurrentUploads={3}
      resumable
      imageCompression
    />
  )
}
```

**Syntax highlighting:** render via Shiki if already available in the monorepo; otherwise plain `<pre>` with a small hand-rolled token colorizer. Check during implementation — do not add Shiki as a new dep just for this.

---

## 8. Testing

### Unit (inside the package)

- `serialize` ⇌ `deserialize` round-trip fidelity for 10 representative configs, including edge cases (empty, every-prop-set, deeply-nested cloudDrives, unicode in i18n overrides)
- `generateCode` snapshot tests for 5 representative configs
- Each toggle primitive (`BoolToggle`, `NumberInput`, `EnumSelect`, `MultiSelect`, `StringInput`, `NestedConfig`) renders and responds to user input
- Category manifest integrity test: every `ToggleEntry.id` resolves to a real path on `UpupUploaderProps` (runtime type check)
- `InteractiveExample` integration test: mount with `initialConfig`, flip a toggle, verify the preview's `<UpupUploader>` receives the updated prop and the generated code output updates

### Visual-parity (landing migration)

- Snapshot the pre-migration landing `HomepageDemo` DOM
- Render `<InteractiveExample defaultExpanded={['settings', 'themes', 'sources', 'options', 'language']} showCodeTab={false} />` and verify the DOM structure + visible class strings match to within ~5% (cover truly-incidental differences like animation keyframe states)
- If an existing visual regression tool (Playwright screenshot comparison, Chromatic) is present, add a test that runs `apps/landing` before and after the swap

### E2E (optional, not blocking)

- Extend `apps/e2e-test` with 3 scenarios that exercise the new component at the playground URL: toggle `mini`, toggle `imageCompression`, change `sources`. Verify the preview DOM reflects each change.

---

## 9. Migration sequence

To minimize risk, implementation should proceed in this order:

1. Scaffold `packages/interactive-example` (package.json, tsconfig, empty `src/index.ts`, empty test folder)
2. Build toggle primitives + tests (isolated, no consumers yet)
3. Build `ConfigContext` + `useConfig` + tests
4. Build `serialize` / `deserialize` + tests
5. Build category manifest + integrity test
6. Build `Sidebar` + `CategorySection` rendering the manifest
7. Build `UploaderPreview` + `CodeTab`
8. Assemble `InteractiveExample.tsx` + integration test
9. Add URL-sync + Copy-permalink button
10. Add `focus` mode (docs-embed path)
11. Swap `apps/playground` to use the new component — visual check
12. Swap `apps/landing` to use the new component — visual parity check
13. Delete the two old `HomepageDemo` folders + `apps/playground/src/components/Uploader.tsx`
14. Run full monorepo test suite
15. Run `apps/e2e-test` Playwright suite

---

## 10. Acceptance criteria

- [ ] `packages/interactive-example` exists, builds in TypeScript, passes `pnpm --filter @upup/interactive-example test`
- [ ] All 9 categories render with every prop from their manifest
- [ ] Flipping any toggle updates the live `<UpupUploader>` preview within one React tick
- [ ] Flipping any toggle updates the generated code output within one React tick
- [ ] `?c=<token>` permalinks round-trip fidelity for any config
- [ ] `apps/landing` hero looks visually identical to before (manual check + existing screenshot diff if available)
- [ ] `apps/playground` renders the full sidebar + Preview/Code tabs; every category section can be expanded and toggles work
- [ ] `focus={['imageEditor']}` renders only the image-editor toggles next to a live preview, no sidebar shell
- [ ] Both old `HomepageDemo` folders are deleted; no dangling imports
- [ ] Full monorepo test suite passes (1729+ tests before; expect +20–30 from this plan)
- [ ] `apps/e2e-test` Playwright suite passes

---

## 11. Future work (separate plans)

1. **AI/IDE deep-links** on the Code tab: Open in Claude Code, Cursor, StackBlitz, CodeSandbox, GitHub.dev, Claude.ai browser, ChatGPT browser, "copy as prompt".
2. **Repo-native AI context files**: `.github/prompts/try-upup.prompt.md`, `.github/agents/upup-explorer.agent.md`, `.claude/skills/upup-explorer/SKILL.md` so that IDE agents have upup context when opened via the deep-links above.
3. **Docs integration**: update Docusaurus pages in `apps/docs` to embed `<InteractiveExample focus={[...]} />` at feature-specific locations.
4. **`useUpupUpload` headless-hook demo mode**: add a "Headless" view-switch that renders a custom UI using the hook instead of `<UpupUploader>`, so users can see how to build bespoke interfaces. Could be a 10th category ("Hook") or a distinct top-level mode.
5. **Config presets**: named presets like "Avatar uploader", "Multi-file import", "Mobile-first" that set the entire toggle state in one click. Useful once the sidebar has enough props that users want a quick starting point.
