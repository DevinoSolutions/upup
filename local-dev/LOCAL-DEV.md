# UpUp Local Development Guide

## Why `.env.ports` Exists

Running several projects side by side (for example `shorty` and `upup`) quickly leads to port collisions if every dev server defaults to `3000`. To keep things predictable we reserve a dedicated port range per project and commit those defaults to `.env.ports`. These values are **safe to version** and can be overridden locally if you really need to.

For UpUp we use the `53000` range:

| Service / Tool            | Env var(s)                   | Default | Notes |
| ------------------------- | ---------------------------- | ------- | ----- |
| Landing (Next.js)         | `PORT` / `LANDING_PORT`      | 53000   | Next reads `PORT`. We also copy it into `LANDING_PORT` for reference. |
| Documentation (Docusaurus)| `PORT` / `DOCS_PORT`         | 53002   | Docusaurus reads `PORT`; `DOCS_PORT` just documents the assignment. |
| Dev upload backend        | `UPUP_DEV_SERVER_PORT`       | 53010   | Used when running `packages/upup/server`. |
| Storybook (component lib) | `STORYBOOK_PORT`             | 53050   | Optional, only when you run `pnpm --filter upup-react-file-uploader storybook`. |

Feel free to extend this list as new local services are added—just stay inside the same range so it is obvious which project owns a given port.

## Getting Started

Each app loads two env files via `dotenv-cli`: the shared `.env.ports` plus its own override in `local-dev/ports/*.env`. That keeps shared values centralized while letting every dev server set its own `PORT`.

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

# start everything (landing + docs + package watcher)
pnpm dev
```

The root `pnpm dev` command automatically loads `.env.ports`, so both the landing app and the docs boot on their reserved ports. If you want to override any value, create a local copy (e.g. `.env.ports.local`) and export it before running the scripts, or temporarily set the env var in your shell.

### Individual apps

```bash
# landing only
pnpm --filter @upup/landing dev

# docs only
pnpm --filter docs dev

# component package storybook
pnpm --filter upup-react-file-uploader storybook -- --port $STORYBOOK_PORT
```

Each script reads from `.env.ports`, so as soon as the file is present you no longer need to pass `--port` manually (the example above just shows how to keep overrides explicit).

## Multi-project Tips

1. Keep each repo’s `.env.ports` committed so teammates instantly know which range is “reserved”.
2. When onboarding a new project, pick a range that is at least 50 ports away from existing ones (e.g. `shorty` = 520xx, `upup` = 530xx, next project = 540xx).
3. If you run Docker-based services, map host ports using the same env values so everything lines up with the docs.
