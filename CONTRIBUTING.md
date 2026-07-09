# Contributing to Upup

We love your input! We want to make contributing to Upup as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

1. Fork the repo and create your branch from **`v2-clean`** — the active v2
   development line. (`master` is the pre-v2 single-package release; the package
   layout this project documents lives on `v2-clean`, which is intentionally
   unmerged.)
2. Use the pinned Node version — this repo ships a `.nvmrc` (Node 20.20.2), so
   run `nvm use` — then install with `pnpm install`. This is a pnpm workspace
   (corepack pins `pnpm@10.11.0`); other package managers will not resolve the
   `workspace:*` links.
3. Make your changes.
4. **See your change render.** A green test suite does not prove a UI change
   looks right — some UI strings have no test or story. Packages consume each
   other's built `dist/`, not `src/`, so an edit to `packages/<pkg>/src` is
   invisible until it is rebuilt:
    - Fastest: run `pnpm dev`, then open the playground at
      `http://localhost:53004` — the package watchers rebuild `packages/*/src`
      on save and the playground hot-reloads.
    - Storybook: build the package once (`pnpm --filter @upup/react build`) or
      keep `pnpm run dev:package` running, then
      `pnpm --filter @upup/storybook-react storybook` (`http://localhost:53050`).
5. Run the checks CI enforces before opening your PR. CLAUDE.md's **Gates**
   section is the authoritative list, `docs/testing.md` explains every test
   layer and how CI routes them, and CLAUDE.md's **E2E** section documents the
   MinIO setup that `pnpm run e2e` needs:
    - `pnpm run prettier-check` — formatting (all nine publishable packages'
      `src/`, `.ts`/`.tsx` only)
    - `pnpm run lint` — required in CI (an input to the Status Check rollup)
    - `pnpm run typecheck`
    - `pnpm run test`
    - `pnpm run test:quality` — test-suite hygiene guard (no `.only`, silent
      skips, vague names, unjustified sleeps)
    - `pnpm run build`
    - `pnpm run size`
    - `pnpm run e2e` — the real gate: real MinIO + real uploads
      CI additionally runs a package-smoke suite (a real tarball consumer build),
      and heavy suites are routed by changed paths — see `docs/testing.md`.
6. Create a pull request!

## Pull Request Process

1. Update the README.md with details of changes if needed
2. The PR will be merged once you have the sign-off of at least one maintainer

## Any contributions you make will be under the MIT Software License

When you submit code changes, your submissions are understood to be under the same [MIT License](LICENSE) that covers the project.

## Report bugs using Github's [issue tracker](https://github.com/DevinoSolutions/upup/issues)

We use GitHub issues to track public bugs.

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening)

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## References

This document was adapted from the open-source contribution guidelines for [Facebook's Draft](https://github.com/facebook/draft-js/blob/master/CONTRIBUTING.md).
