# Handoff: Web Cross-Platform Strategy End-To-End Execution

Generated: 2026-05-30, America/Toronto.

## Mandate

Continue the original `HANDOFF_web-cross-platform-strategy_2026-05-29_1645_EST.md` job end to end without requiring repeated "continue" prompts.

The working branch must remain `v2-clean`.

The agent should keep moving through the original strategy until the whole job is genuinely complete:

1. Finish Storybook as the real cross-framework QA/dev surface.
2. Stabilize Vue parity against React for web uploader behavior.
3. Migrate useful legacy playground/e2e scenarios into Storybook/package/landing tests.
4. Move the polished marketing demo into `apps/landing`, rendering real `@upup/react` only.
5. Retire the old surfaces only after useful scenarios are migrated:
   - `apps/playground`
   - `apps/playground-api`
   - `apps/e2e-test`
   - `packages/interactive-example`

Do not stop after one migrated scenario unless blocked by a real external dependency or destructive decision.

## Non-Negotiable Decisions

- Landing owns the polished marketing demo.
- Landing demo renders real `@upup/react` only.
- Landing framework selector changes code, install, capability messaging only.
- Storybook owns real framework QA/dev/PR review.
- React and Vue Storybooks render their actual packages.
- Do not create `packages/playground-core`.
- Do not couple landing demo config to Storybook config.
- `@upup/core` stays browser-web focused for now.
- React Native and vanilla JS are deferred.

## Continuous Validation Loop

Run a local cron-equivalent validation loop while doing this work. This repo is currently on Windows/PowerShell, so use a PowerShell loop instead of Unix cron unless the environment changes.

All shell commands must be prefixed with `rtk`, per repo instructions. Do not run raw `pnpm`, `git`, `node`, or PowerShell build/test commands without `rtk`.

Start the loop in a separate hidden terminal/session and write logs to `.tmp/continuous-validation.log`.

Suggested loop:

```powershell
New-Item -ItemType Directory -Force ".tmp" | Out-Null
while ($true) {
    "`n===== $(Get-Date -Format o) =====" | Tee-Object -Append ".tmp/continuous-validation.log"
    rtk pnpm --filter @upup/react run typecheck 2>&1 | Tee-Object -Append ".tmp/continuous-validation.log"
    rtk pnpm --filter @upup/vue run typecheck 2>&1 | Tee-Object -Append ".tmp/continuous-validation.log"
    rtk pnpm run build:storybook 2>&1 | Tee-Object -Append ".tmp/continuous-validation.log"
    Start-Sleep -Seconds 300
}
```

Use this as a safety net, not as a replacement for targeted foreground validation. After each meaningful implementation slice, still run the relevant foreground checks and browser verification.

If the loop fails:

1. Read the most recent failure from `.tmp/continuous-validation.log`.
2. Fix the failure before starting unrelated work.
3. Rerun the failed command in the foreground.
4. Continue the end-to-end plan once green.

Stop the validation loop before sending the final completion response.

## Context And Parallel Work Discipline

Do not burn the global context window by dumping large files, logs, or test output into the main thread.

Use these tools deliberately:

- `rtk` for every shell command.
- `context-mode` for large-file inspection, legacy e2e inventory, long logs, generated Storybook output, and any task where only a summary is needed.
- Subagents/multi-agent tools when available for independent audits or long-running review slices.

Recommended subagent work packets:

1. Legacy scenario inventory:
   - Review `apps/e2e-test/e2e`, `apps/playground/e2e`, and `packages/interactive-example/src/tests`.
   - Produce a concise migration matrix: migrate to Storybook, migrate to package test, migrate to landing smoke, or drop with reason.
2. Storybook parity audit:
   - Compare React and Vue story coverage and list missing paired stories.
   - Do not edit files; report gaps.
3. Landing demo audit:
   - Inspect `apps/landing` and `packages/interactive-example`.
   - Identify the smallest set of marketing demo pieces to move into landing without coupling to Storybook.
4. Code review/security pass:
   - Review changed files for regressions, brittle tests, accidental coupling, and user-data/API risks.

Subagents should return short, structured findings with file paths and line references. They should not make broad edits unless explicitly assigned an implementation slice. The main agent remains responsible for integration, validation, browser testing, and final cleanup.

## Required Browser Verification

Storybook/UI work is not confirmed until verified through Chrome DevTools MCP.

For every migrated interaction slice:

- Start Storybook.
- Verify React story interaction panel shows PASS.
- Verify Vue story interaction panel shows PASS when the scenario is supported by Vue.
- Capture screenshots under `.tmp/`.
- Stop Storybook before final response.

## Full Manual E2E Browser MCP Requirement

Do not treat Storybook interaction tests or production builds as sufficient. Before declaring a slice complete, run manual E2E flows through Browser MCP that exercise real UI behavior as a user would.

For package Storybooks, manually verify the supported React and Vue flows end to end:

- local file selection,
- multiple file selection,
- removing one file while others remain,
- restrictions rejection and later valid acceptance,
- upload success,
- upload progress,
- upload failure and retry affordance,
- URL source open, cancel, fetch success, and fetch failure where supported,
- drag/drop and paste where supported,
- server mode success and error,
- processing success, failure, and timeout,
- source panel switching and cancel back to main view,
- light/dark theme rendering,
- RTL/i18n rendering.

For the landing demo, manually verify with Browser MCP:

- the live preview renders real `@upup/react`,
- framework selector does not swap the live renderer,
- framework selector changes install command, code snippet, and capability messaging only,
- unsupported Vue/vanilla/future capabilities are not presented as live,
- demo API/mock routes behave deterministically,
- mobile and desktop layouts have no overlapping text or broken controls.

For old surface retirement, manually verify:

- no root script still depends on retired apps/packages,
- migrated scenarios still pass in Storybook/package/landing checks,
- deleted or retired surfaces are documented with migration evidence.

Capture screenshots for meaningful interaction states, not just initial page loads. Prefer checking the Storybook Interactions panel plus the preview iframe DOM state. A "page loaded" smoke check is not enough.

If a manual Browser MCP flow fails, fix the product behavior or story setup before continuing to unrelated work.

## Current Progress Snapshot

Completed so far:

- Storybook foundation exists:
  - React package Storybook.
  - Vue package Storybook.
  - composed `apps/storybook` hub.
  - shared deterministic mocks in `storybook/upupNetworkMocks.ts`.
- Upload flow migrated and browser verified:
  - React/Vue Success.
  - React/Vue Failure.
  - React/Vue Progress.
- Server-drive and processing/story taxonomy work exists.
- Restrictions migrated and browser verified:
  - React/Vue invalid type rejection.
  - React/Vue too-large rejection.
  - React/Vue too-small rejection.
  - React/Vue valid image acceptance.
- Multiple-file behavior migrated and browser verified:
  - React/Vue multiple selection.
  - React/Vue single-file removal while other files remain.
- A Vue parity bug was fixed:
  - Vue removal now goes through `UploaderOrchestrator.removeFile`, matching React.
  - Vue file list renders from current Map state with stable keys.

Known validation commands that were passing:

```powershell
rtk pnpm --filter @upup/react run typecheck
rtk pnpm --filter @upup/vue run typecheck
rtk pnpm run build:storybook
```

## Next Migration Slices

Continue migrating useful legacy coverage before retiring old apps.

Recommended order:

1. URL adapter fetch/cancel behavior from `apps/e2e-test/e2e/adapters.spec.ts`.
2. Drag/drop and paste behavior from `apps/e2e-test/e2e/file-interactions.spec.ts`.
3. Remaining adapter panel coverage that is not already represented in Storybook.
4. Any useful `apps/playground/e2e/playground-deep.spec.ts` scenarios that should survive as Storybook/package/landing tests.
5. Landing demo migration into `apps/landing/src/features/demo`.
6. Retirement cleanup for old apps/packages after migration evidence is complete.

## Completion Criteria

The original job is complete only when all of these are true:

- Every legacy e2e/playground scenario has been reviewed.
- Useful scenarios are migrated to Storybook, package tests, or landing smoke tests.
- Intentionally dropped scenarios are documented with a short reason.
- React and Vue Storybooks build.
- React and Vue typechecks pass.
- Browser verification screenshots exist for the important migrated interactions.
- Landing has the polished React-only demo and framework selector messaging.
- Old demo/test surfaces are removed or clearly retired after migration.
- No background Storybook, browser, or validation-loop process is left running.

## Stop Conditions

Do not stop for normal slice boundaries. Continue automatically.

Stop only if:

- a destructive deletion/retirement decision is about to be made without enough migration evidence,
- a required secret/external credential is needed,
- the same validation failure repeats after focused debugging,
- the user explicitly changes direction,
- or the completion criteria above are fully satisfied.
