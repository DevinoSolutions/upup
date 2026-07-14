# Upup Pull Request Template

## Description

<!-- TODO: Please include a summary of the change and which issue is fixed. Include relevant motivation and context. -->

Fixes # (issue)

## Type of change

<!-- TODO: Please delete options that are not relevant. -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Checklist

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works, with behavior-driven names (see `docs/testing.md`)
- [ ] I have added a changeset (`pnpm changeset`) if this PR changes any publishable `@upupjs/*` package

## Test-foundation checklist (delete rows that cannot apply)

- [ ] UI change: landed in `@upupjs/react` first, ported DOM-identically, and `parity-fixtures.json` was regenerated via `UPDATE_PARITY=1` + reviewed like code (never in CI)
- [ ] New/renamed story: name, id, args, and variants stay consistent across all six framework storybooks (or the divergence is documented where it lives)
- [ ] Public export changed: the affected package's `public-api` pin was updated deliberately (core: also `internal-surface`)
- [ ] Packaging/dependency change: `pnpm run smoke:packages` passes locally
- [ ] New test suite or moved test directory: the impact map in `scripts/ci/resolve-affected-tests.mjs` still routes it (add a rule + table-driven test if not)
- [ ] New env var: added to the relevant `local-dev/*.example` file and `scripts/validate-env.mjs` schema (`pnpm run env:check`)
- [ ] New third-party integration: sandbox/test credentials documented in `docs/testing.md` (names, scopes, callback URLs) — never production credentials
- [ ] No new `.only`, silent skips, unjustified sleeps, or integration-layer mocks (`pnpm run test:quality`)
