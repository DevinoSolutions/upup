# v2-clean → master merge readiness

**Date:** 2026-04-19
**Branch:** v2-clean
**Status:** 284 commits ahead of master, 0 behind.

This report is intentionally a **readiness audit, not a merge trigger.**
The user has been explicit that v2-clean is not to be merged yet; this
doc just captures the state so that when the decision is made, the
delta between "press merge" and "it's clean" is as small as possible.

---

## Test posture

| Suite | Count | Status |
|---|---|---|
| `@upup/shared` vitest | 360 | ✅ pass |
| `@upup/core` vitest | 571 | ✅ pass |
| `@upup/react` vitest | 780 | ✅ pass |
| `@upup/interactive-example` vitest | 66 | ✅ pass |
| `apps/e2e-test` Playwright | 50 | ✅ pass (10.9s) |
| **Total** | **1,827** | ✅ |

Typecheck (filtering pre-existing non-v2-clean noise): clean on every
workspace package plus landing.

---

## Commit composition — what's on this branch

By conventional-commit scope:

| Scope | Count | Representative work |
|---|---|---|
| `feat(react)` | 56 | UpupUploader refactor, v2 API surface |
| `feat(react/v2)` | 54 | v2 plan implementations (themes, slots, adapters) |
| `test(react)` | 49 | new vitest suites for v2 behaviour |
| `test(core)` | 33 | pipeline, upload manager, strategies tests |
| `feat(interactive-example)` | 23 | playground polish (icons, presets, event log, slider) |
| `fix(react)` | 6 | SSR hydration, stale state cleanup |
| `test(shared)` | 5 | i18n + theme types + flattenSlots |
| `fix(interactive-example)` | 5 | playground polish iterations |
| `chore` | 5 | dev-loop, changeset, CHANGELOG |
| `refactor(interactive-example)` | 4 | Advanced-split, Size+Unit inline, presets icons |
| `feat(core+react)` | 4 | cross-package features |
| `feat(core/v2)` | 4 | v2 core additions |
| `test(e2e)` | 3 | Playwright additions + maxFiles spec |
| `feat(e2e)` | 3 | new Playwright scenarios |
| `feat` | 3 | cross-package UX additions |

About ~220 other commits — mostly early v2 refactor work from prior
sessions.

## Files changed vs master

473 files total. Distribution:

- `packages/**` — core package work (react, core, shared, server,
  interactive-example)
- `apps/landing/**`, `apps/playground/**`, `apps/e2e-test/**`,
  `apps/docs/**` — consumer surface updates
- `docs/superpowers/plans/` + `docs/superpowers/audits/` — planning
  artefacts (optional to include in merge; see "housekeeping" below)
- `.changeset/v2-1-legacy-prop-removal.md` — new release trigger
- `CHANGELOG.md` (new) — repo-root release notes
- `apps/docs/docs/migration/v2-to-v2.1.md` (new) — migration guide
- `pnpm-lock.yaml` — ~1,767 line delta (workspace deps rewritten)

---

## Pre-merge housekeeping

### 1. Working-tree artefacts (untracked, intentional hold)

The following are in the working tree but not committed, per earlier
user instruction to leave them out:

- `docs/superpowers/audits/*.png` (~50 screenshots from audit work)
- `docs/superpowers/plans/2026-04-07-v2-clean-completion.md`
- `docs/superpowers/plans/2026-04-14-axe-per-component-regression.md`
- `docs/superpowers/plans/2026-04-18-playground-ux-cleanup.md`
- `docs/superpowers/plans/2026-04-18-playground-ux-deep-pass.md`
- `docs/superpowers/plans/2026-04-18-thorough-backlog.md`
- `docs/superpowers/plans/2026-04-19-merge-readiness.md` (this file)
- `docs/v2-clean-vs-dev.md`

**Recommendation before merge:** decide as a pre-merge checklist
whether these go into the merge commit. The screenshots are large
(~30 MB aggregate) but are useful references. The plans are already
mostly cleared (most work shipped). Options:
- Commit them selectively before merge as `docs(plans): capture v2.1
  planning artefacts`
- Delete the obsolete ones (2026-04-07, 2026-04-14, 2026-04-18 plans —
  superseded by this report), commit the rest
- Leave them all out of master entirely (cleaner git history but loses
  the paper trail)

### 2. Squash-candidate commits

A few short fix-up sequences would read cleaner as a single commit:

- `2dcad76 fix(@upup/react): eliminate SSR hydration mismatches`
  + `1ced0fd fix(interactive-example): skip SSR for UploaderPreview`
  + `f88963b fix(interactive-example): forward page theme`
  + `384d518 fix(interactive-example): respect html.dark/light`
  — all four are one logical bug fight (SSR hydration). Consider
  squashing into one commit on merge.
- `b874f6d refactor(interactive-example): presets use icons`
  + `8edd26e feat(interactive-example): preset bar + collapse-by-default`
  — both part of the same "quick-start presets" feature. Squashable.

Use `git rebase -i master` with an explicit edit list, or leave as-is
and let the merge commit be the unit of history. Either is defensible.

### 3. Outstanding scope tickets (not blocking merge, tracked for later)

These items are in the backlog but intentionally deferred:

- **Axe-per-component a11y regression suite** — `P2-2` in
  `2026-04-18-thorough-backlog.md`. Plan scaffolded, no tests yet.
- **CoreOptions nested-shape alignment** — `P2-3`. Plan in the
  same backlog doc.
- **Server strategies 3–6** — `P2-4`. Needs ~6 hr, own sprint.
- **Three form fields without `id` or `name`** — surfaced in DevTools
  console. Small. Fix on its own or as part of the a11y suite.
- **packages/upup strategy decision** — see separate ADR.

---

## Merge strategy options when you're ready

### A. Single squash merge
Fast, clean master history. Loses the 284-commit breadcrumb trail but
preserves the CHANGELOG for consumers. Use when internal history is
not important.

### B. Merge commit (no squash, --no-ff)
Keeps the 284 commits on master but groups them under one "Merge pull
request #XXX from v2-clean" commit. Gives you `git bisect` friendliness
if a regression shows up later. **Recommended.**

### C. Rebase + fast-forward
Replays the 284 commits linearly on master. Cleanest history but the
biggest-effort option — conflicts in `pnpm-lock.yaml` are near-certain
even though master has been idle.

---

## Current verdict

**Mergeable in principle.** No blockers, no stale props, no broken
types, no failing suites. The branch now represents a coherent v2.1
release; the migration guide and CHANGELOG are in place.

**Hold reason** (per user): "we no matter what do not want to merge
this to master." When that changes, this report is the pre-flight
checklist.
