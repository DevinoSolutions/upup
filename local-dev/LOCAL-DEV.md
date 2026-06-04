# UpUp Local Development Guide

## Why `local-dev/.env.ports` Exists

Running several projects side by side (for example `shorty` and `upup`) quickly leads to port collisions if every dev server defaults to `3000`. To keep things predictable we reserve a dedicated port range per project and commit those defaults to `local-dev/.env.ports`. These values are **safe to version** and can be overridden locally if you really need to.

For UpUp we use the `53000` range:

| Service / Tool             | Env var(s)              | Default | Notes |
| -------------------------- | ----------------------- | ------- | ----- |
| Landing (Next.js)          | `PORT` / `LANDING_PORT` | 53000   | Next reads `PORT`. We also copy it into `LANDING_PORT` for reference. |
| Documentation (Docusaurus) | `PORT` / `DOCS_PORT`    | 53002   | Docusaurus reads `PORT`; `DOCS_PORT` just documents the assignment. |
| Dev upload backend         | `UPUP_DEV_SERVER_PORT`  | 53010   | Used when running `packages/upup/server`. |
| Storybook hub              | n/a                     | 6006    | Composes the package Storybooks. `pnpm dev` opens this hub. |
| React Storybook            | n/a                     | 6007    | Package QA Storybook. |
| Vue Storybook              | n/a                     | 6008    | Package QA Storybook. |
| Vanilla Storybook          | n/a                     | 6009    | Package QA Storybook. |
| Preact Storybook           | n/a                     | 6010    | Package QA Storybook. |
| Solid Storybook            | n/a                     | 6011    | Package QA Storybook. |
| Svelte Storybook           | n/a                     | 6012    | Package QA Storybook. |
| Qwik Storybook             | n/a                     | 6013    | Package QA Storybook. |
| Angular Storybook          | n/a                     | 6014    | Package QA Storybook. |
| Next.js Storybook          | n/a                     | 6015    | Package QA Storybook. |

Feel free to extend this list as new local services are added—just stay inside the same range so it is obvious which project owns a given port.

## Getting Started

Each app loads two env files via `dotenv-cli`: the shared `local-dev/.env.ports` plus its own override in `local-dev/ports/*.env`. That keeps shared values centralized while letting every dev server set its own `PORT`, even if the parent process already defined one.

```
local-dev/
  LOCAL-DEV.md
  ports/
    landing.env   # sets PORT=53000 for the Next.js app
    docs.env      # sets PORT=53002 for Docusaurus
```

```bash
# install deps
pnpm install

# start everything (landing + docs + package watcher + Storybook hub)
pnpm dev
```

The root `pnpm dev` command automatically loads `local-dev/.env.ports`, starts the landing app, docs, package watchers, and all package Storybooks, then opens the composed Storybook hub at `http://localhost:6006`. If you want to override any value, create a local copy (e.g. `local-dev/.env.ports.local`) and export it before running the scripts, or temporarily set the env var in your shell.

### Individual apps

```bash
# landing only
pnpm --filter @upup/landing dev

# docs only
pnpm --filter docs dev

# all package Storybooks plus composed hub, without opening a browser
pnpm storybook

# all package Storybooks plus composed hub, opening the browser
pnpm storybook:open
```

Each script reads from `local-dev/.env.ports`, so as soon as the file is present you no longer need to pass `--port` manually (the example above just shows how to keep overrides explicit).

## Multi-project Tips

1. Keep each repo's `local-dev/.env.ports` committed so teammates instantly know which range is "reserved".
2. When onboarding a new project, pick a range that is at least 50 ports away from existing ones (e.g. `shorty` = 520xx, `upup` = 530xx, next project = 540xx).
3. If you run Docker-based services, map host ports using the same env values so everything lines up with the docs.
