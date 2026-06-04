# Web Cross-Platform Migration Audit - 2026-05-30

This note records the legacy scenario review for the Upup web cross-platform strategy migration.

## Scope Reviewed

- `apps/e2e-test/e2e/adapters.spec.ts` - 13 tests.
- `apps/e2e-test/e2e/data-testid.spec.ts` - 10 tests.
- `apps/e2e-test/e2e/file-interactions.spec.ts` - 10 tests.
- `apps/e2e-test/e2e/restrictions.spec.ts` - 10 tests.
- `apps/e2e-test/e2e/upload-flow.spec.ts` - 7 tests.
- `apps/e2e-test/e2e/uploader-render.spec.ts` - 16 tests.
- `apps/playground/e2e/playground-deep.spec.ts` - 48 tests.

No `packages/playground-core` package was created.

## Migrated Coverage

| Legacy coverage | New home | Notes |
| --- | --- | --- |
| URL source panel, cancel behavior, URL fetch success, URL fetch failure | React and Vue `UploaderSources` Storybook stories | URL fetch hooks now support cancel via `AbortController`; cancel emits `url-fetch-cancel` and avoids stale state/error updates after abort. |
| Google Drive, OneDrive, Dropbox, and Box client auth fallback prompts | React and Vue `UploaderSources` Storybook stories | Storybook network mocks install deterministic Google Identity behavior and dummy client cloud config. |
| Local file selection, multiple add/remove, disabled drag/drop, drag/drop, and paste | React and Vue `UploaderBehavior` Storybook stories | React and Vue stories exercise the real packages with Play functions and Browser MCP manual verification. |
| Restrictions: file type, min/max size, and max count | React and Vue Storybook restriction stories plus package tests | Keeps UI acceptance/rejection coverage in Storybook and lower-level validation in package tests. |
| Upload success, progress, failure, retry, server-mode success/failure, and processing success/failure/timeout | React and Vue upload-flow, server-mode, and processing Storybook stories | Browser MCP verified the key React flows and representative Vue flows; package tests cover upload state details. |
| Core upload mechanics: direct upload headers, multipart, retry, pause/resume/cancel, recovery, checksum, dedupe, metadata, tus, and processing payloads | Existing `packages/core`, `packages/server`, `packages/react`, and `packages/vue` tests | Verified by the package test suites instead of duplicating engine behavior in the UI QA surface. |
| Theme, RTL/i18n, data-testid selectors, and framework parity rendering | React and Vue Storybook stories | Storybook owns real React/Vue framework QA. |
| Polished marketing demo, framework selector, mobile layout, and demo API | `apps/landing/src/features/demo` and `apps/landing/src/app/api/upup-demo/[...path]/route.ts` | Landing renders real `@upup/react` only; Vue/Core selector state changes install commands, code snippets, and capability text only. |

## Intentionally Retired

| Legacy scenario group | Disposition | Reason |
| --- | --- | --- |
| Playground shell, source-control panel wiring, category configurator, and generated-code exhaustiveness | Retired with `apps/playground` and `packages/interactive-example` | The old configurator was React-coupled and not part of the target product surface. Landing now owns polished code snippets, while Storybook owns framework QA. |
| Mastra assistant canned prompts and local playground patching | Retired with `apps/mastra` | The assistant was only attached to the old playground workflow and was not used by the new landing or Storybook surfaces. |
| Old event-log UI assertions and playground-only validation callback displays | Retired as playground UI behavior | Real event behavior remains covered by package tests and Storybook interactions; the old event-log panel was a playground diagnostic, not a reusable product surface. |
| Exact old visual copy such as eight source icons, old branding footer assertions, and old playground shell text | Retired as brittle harness-specific assertions | New Storybook and landing checks validate the real uploader DOM, sources, theme, and layout without preserving the old harness copy. |
| Fake browser media-device capture end-to-end flows for camera, microphone, and screen capture | Retired from the cross-framework UI matrix | Source panel rendering remains covered. Full fake device capture is browser-permission-specific and brittle in Storybook; media-source internals stay in package-level behavior tests where practical. |
| External tus upload through the playground mock UI | Not recreated as a Storybook UI scenario | Tus behavior is package/server responsibility and is covered by package tests; Storybook avoids external protocol setup in visual QA. |
| Playground-only mock-object URL names and generated ICU code output | Replaced | URL fetch is covered through deterministic Storybook and landing routes. I18n text/RTL behavior is covered in Storybook; generated ICU output belonged to the retired configurator. |

## Validation Evidence

- `pnpm run typecheck` passed for the active workspace.
- `pnpm --filter @upup/core run test` passed.
- `pnpm --filter @upup/react run test` passed.
- `pnpm --filter @upup/vue run test` passed.
- `pnpm run build:package` passed.
- `pnpm run build:storybook` passed for React, Vue, and the composed hub.
- `pnpm --filter @upup/landing run build` passed.
- Browser MCP verification covered Storybook React, Storybook Vue, and landing desktop/mobile flows. Screenshots were saved under `.tmp/screenshots`.

