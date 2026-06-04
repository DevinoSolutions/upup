# Handoff: Web Cross-Platform Strategy

Generated: 2026-05-29 16:45 Eastern time from the local machine. Note: Toronto is on EDT on this date; filename uses `EST` per request.

## Goal

Make Upup's web support credible across frameworks without overengineering a fake universal playground.

The agreed split:

- `apps/landing` owns marketing and the polished interactive demo.
- Storybook owns real framework QA, development, PR review, and cross-framework validation.
- `@upup/core` stays browser-web focused for now.
- React Native/runtime abstraction is deferred.
- Vanilla JS is a future web adapter, not a runtime rewrite.

## Final Direction

The public demo should live directly inside the Next.js landing app.

The landing demo:

- Renders the real React uploader only.
- Uses framework selection for install commands, code snippets, feature notes, and capability messaging.
- Must not imply Vue, vanilla, or future adapters are live-rendered unless they actually are.
- Can use `apps/landing/src/app/api/...` routes directly because landing is already a Next.js app.
- Does not need `apps/playground-api`.

Storybook:

- Becomes the real development and QA surface.
- Runs actual React stories against `@upup/react`.
- Runs actual Vue stories against `@upup/vue`.
- Later runs actual vanilla stories against `@upup/vanilla`.
- Should support PR review, visual testing, interaction testing, and a clear feature support matrix.

## Target Structure

```txt
apps/
  landing/        # marketing site + rich demo + Next API routes
  storybook/      # composed QA hub for framework Storybooks
  docs/           # docs site
  mastra/         # keep only if still used

packages/
  core/           # browser web core
  react/          # real React package + React stories
  vue/            # real Vue package + Vue stories
  server/         # app-owned server handler package
  vanilla/        # later: browser DOM renderer package
```

Retire after migration:

```txt
apps/playground
apps/playground-api
apps/e2e-test
packages/interactive-example
```

## Current Repo Facts

- `apps/landing` is a Next.js app and already has an API route:
  - `apps/landing/src/app/api/upup/[...path]/route.ts`
  - It uses `createUpupHandler` from `@upup/server/next`.

- `apps/playground-api` is therefore not needed for the new direction. If the landing demo needs mock uploads, presign, processing, or demo-only behavior, add those as landing API routes.

- `apps/e2e-test` is a historical Vite React harness:
  - It uses `@upup/react`, Vite, and Playwright.
  - It is React-only.
  - It overlaps with what Storybook should become.
  - It does not appear to be central to root scripts.
  - Before deletion, migrate any useful Playwright scenarios into Storybook interaction tests, package tests, or a dedicated landing smoke test if needed.

- `packages/interactive-example` is React-coupled:
  - `src/types.ts` imports `UpupUploaderProps` from `@upup/react`.
  - `src/preview/UploaderPreview.tsx` renders `UpupUploader` from `@upup/react`.
  - `src/code/generateCode.ts` hardcodes React imports.
  - It should not become shared cross-framework infrastructure.

- `apps/playground` currently imports `@upup/interactive-example`. It is a marketing/configurator surface, not a real framework QA surface.

- There is no real Storybook setup yet. Only docs/local-dev references mention Storybook.

## Why No Shared Playground Core

We explicitly decided not to create `packages/playground-core` right now.

Reason:

- The landing demo is a marketing experience.
- The landing preview will only render React.
- Storybook must render real framework packages.
- Sharing config between them would create false precision and unnecessary coupling.
- If duplication becomes painful later, extract only the proven shared pieces.

The correct relationship is:

```txt
landing demo: marketing truth
storybook: implementation truth
packages/core/react/vue/server: product truth
```

## Storybook Investment Plan

Storybook should feel like a cross-framework QA console, not a loose demo gallery.

Recommended shape:

```txt
apps/storybook/
  # composed hub using refs to framework Storybooks

packages/react/
  .storybook/
  src/**/*.stories.tsx

packages/vue/
  .storybook/
  src/**/*.stories.ts
```

Because Storybook renderers are framework-specific, React and Vue should each have real framework Storybooks. `apps/storybook` can compose them into one review hub.

### Story Taxonomy

Keep matching story names across frameworks:

```txt
Uploader/Basic
Uploader/Restrictions
Uploader/Theme/Light
Uploader/Theme/Dark
Uploader/I18n/RTL
Uploader/ServerMode/Success
Uploader/ServerMode/Error
Uploader/Sources/Local
Uploader/Sources/URL
Uploader/Sources/Camera
Uploader/Processing/Success
Uploader/Processing/Failure
```

This gives contributors and PR reviewers a predictable checklist.

### Feature Support Matrix

Add a Storybook MDX page:

```txt
Feature          React      Vue       Vanilla
Local upload     yes        yes       planned
Server mode      yes        partial   planned
Cloud drives     yes        partial   planned
Image editor     yes        no        no
Camera           yes        partial   planned
I18n/RTL         yes        yes       planned
```

The matrix should reflect real implementation status, not marketing aspirations.

### Mock-First QA

Storybook should not depend on real S3, Google OAuth, env vars, or landing routes.

Add deterministic mocks for:

- presign success
- presign failure
- upload progress
- upload failure
- server mode response
- fake cloud-drive file listing
- fake cloud-drive transfer
- processing/SSE completion
- processing/SSE timeout

Add a separate "manual integration" area later for real credentials.

### Interaction And Visual Tests

Invest in:

- selecting a file
- rejecting oversized file
- rejecting invalid file type
- removing a file
- retrying failed upload
- upload success
- upload failure
- theme switching
- RTL rendering
- opening source panels
- server-mode state

Use Storybook's current Vite/Vitest path where practical. Current docs recommend the Vitest addon over the older test-runner path for Vite-powered Storybooks.

### PR Review DX

Long term, every PR should expose:

```txt
React Storybook preview
Vue Storybook preview
Visual diff report
Interaction test result
```

Chromatic or another preview deployment can handle this.

## Landing Demo Plan

Move useful marketing/configurator pieces into landing as internal code:

```txt
apps/landing/src/features/demo/
  DemoSection.tsx
  ReactLivePreview.tsx
  FrameworkSelector.tsx
  CodePanel.tsx
  codegen.ts
  capabilities.ts
```

The landing framework selector controls:

- install command
- import snippet
- example component code
- capability notes
- unsupported feature warnings

It should not claim live Vue or vanilla rendering.

Suggested wording:

- "Framework code"
- "Code output"
- "Install target"

Avoid wording like:

- "Vue live preview"
- "Testing Vue"
- "Running vanilla"

unless those are actually true.

## Cross-Framework Quality Bar

Before calling a framework supported, it should prove:

- package builds
- package typechecks
- package tests pass
- storybook builds
- component renders without crashing
- local file selection works
- restrictions work
- upload progress works
- error/remove/retry states work
- light and dark theme work
- i18n and RTL work
- server mode configuration works
- CSS import works
- SSR/import safety is verified where relevant

## CI And Scripts

Suggested root scripts:

```txt
pnpm storybook
pnpm storybook:react
pnpm storybook:vue
pnpm build:storybook
pnpm test:storybook
```

Suggested release gate:

```txt
@upup/core typecheck/test/build
@upup/server typecheck/test/build
@upup/react typecheck/test/build
@upup/vue typecheck/test/build
React Storybook build
Vue Storybook build
```

Visual and interaction tests can start advisory, then become required once stable.

## Uppy Positioning Context

We agreed Upup should not try to beat Uppy on breadth.

Uppy is already mature and broad. Upup's wedge should be:

- polished productized uploader
- app-owned backend handler
- simpler high-level typed API
- strong theming and app integration
- first-class upload plus post-upload processing UX
- framework-native packages over a shared browser core

Use Uppy when:

```txt
I want the most mature upload toolkit and I am comfortable assembling plugins/services.
```

Use Upup when:

```txt
I want a polished uploader feature owned by my app backend, with a simpler typed API.
```

## React Native And Vanilla Context

React Native is deferred.

Reason:

- It requires a new runtime/file model.
- Current core assumes browser `File`, `Blob`, DOM APIs, canvas, object URLs, IndexedDB/localStorage, and browser OAuth flows.
- It is much harder than another web framework adapter.

Vanilla JS is feasible later.

Reason:

- It stays in the browser.
- It can reuse `@upup/core`.
- A future `@upup/vanilla` would be a DOM renderer around core, not a runtime rewrite.

Potential future API:

```ts
import { createUploader } from '@upup/vanilla'
import '@upup/vanilla/styles'

const uploader = createUploader('#upload', {
  mode: 'server',
  serverUrl: '/api/upup',
  sources: ['local', 'url'],
})
```

## Sprint Plan

1. Create the Storybook foundation.
   - Add real React Storybook.
   - Add real Vue Storybook.
   - Add composed `apps/storybook` hub.
   - Add first shared story taxonomy.

2. Add deterministic Storybook mocks.
   - Mock upload success/failure/progress.
   - Mock server mode.
   - Mock processing/SSE.
   - Mock cloud-drive listing/transfer.

3. Stabilize Vue.
   - Verify render, local upload, restrictions, theme, i18n, server mode.
   - Add Vue stories and missing tests.
   - Do not market unsupported features as live.

4. Move marketing demo into landing.
   - Build `apps/landing/src/features/demo`.
   - Use real React live preview.
   - Use framework selector for code/capability messaging.
   - Use landing API routes only.

5. Migrate useful legacy coverage.
   - Review `apps/e2e-test` tests.
   - Review `apps/playground/e2e`.
   - Move valuable scenarios into Storybook/package tests.

6. Retire old demo surfaces.
   - Remove or mark legacy:
     - `apps/playground`
     - `apps/playground-api`
     - `apps/e2e-test`
     - `packages/interactive-example`

## Do Not Do Yet

- Do not create `packages/playground-core`.
- Do not build iframe-based multi-framework preview.
- Do not make the landing demo pretend to render Vue.
- Do not add React Native runtime abstraction.
- Do not add vanilla package until React/Vue web strategy is solid.
- Do not couple landing demo config to Storybook config.

## Open Questions For Next Chat

- Should `apps/storybook` be a pure composed hub only, or should it also host overview/MDX pages?
- Which preview provider should be used for PR links: Chromatic, Vercel static Storybook, Netlify, or GitHub Pages?
- Which old e2e scenarios are valuable enough to migrate before deleting `apps/e2e-test` and `apps/playground`?
- Should landing demo use real uploads by default, mocked uploads by default, or a toggle?
- Should unsupported framework features be hidden, disabled with explanation, or shown in a comparison matrix?
