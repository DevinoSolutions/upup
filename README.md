# Upup Monorepo

This repository now hosts the Upup React uploader package alongside the marketing landing page and documentation site. The codebase is managed with pnpm workspaces and Turborepo so local package changes can be previewed immediately in both client apps.

## Structure

- `apps/landing` – Next.js landing experience that embeds the local `upup-react-file-uploader`.
- `apps/docs` – Docusaurus site that documents Upup and exports static assets consumed by the landing app.
- `packages/upup` – Source for the published `upup-react-file-uploader` package (stories, server mocks, tests, etc.).

Shared tooling lives at the repository root (`package.json`, `turbo.json`, `pnpm-workspace.yaml`).

## Getting Started

```bash
pnpm install
pnpm dev
```

`pnpm dev` launches the landing page and documentation in watch mode via Turborepo while the package builds in watch mode for local consumption. All services use ports defined in `local-dev/.env.ports` to avoid conflicts with other projects.

### Development Commands

- `pnpm dev` – run everything (landing + docs + package in watch mode)
- `pnpm dev:package` – run Storybook plus the local mock server for the package only
- `pnpm build` – build all workspaces (package bundle, docs static output, Next production build)
- `pnpm build:package` – build only the library package
- `pnpm build:landing` / `pnpm build:docs` – targeted builds for individual apps
- `pnpm lint` / `pnpm test` / `pnpm typecheck` – workspace-wide pipelines through Turborepo

### Port Configuration

This project uses the **53000 port range** (see `local-dev/.env.ports`):
- Landing: 53000
- Docs: 53002
- Dev Server: 53010
- Storybook: 53050

This avoids conflicts with other projects like Shorty (52000 range). See `local-dev/LOCAL-DEV.md` for details.

## Dokploy & Nixpacks

Deployment environments that rely on Nixpacks can continue to use the provided `nixpacks.toml`, which now points at the Turborepo-driven build (`pnpm run build`) and starts the Next.js app with `pnpm start`.

For Dokploy templates, point to this repository root so both apps and the package are built together. Any new package changes automatically flow into the landing page and documentation during their builds.

## Package Publishing

When you're ready to release a new version of `upup-react-file-uploader`, run the usual Changesets workflow from the monorepo root (e.g. `pnpm --filter upup-react-file-uploader run release`). The package directory retains all existing build, lint, and test tooling.
