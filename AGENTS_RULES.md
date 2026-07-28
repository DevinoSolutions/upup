# AGENTS_RULES — quirks & traps for anyone (human or agent) working on the upup sites

Operational notes from the 2026-07-27 full-site QA sweep (dev.useupup.com +
dev-playground.useupup.com: 46 routes × light/dark × desktop/mobile, link crawl,
interaction and animation checks). CLAUDE.md stays the process authority; this file
records site/QA quirks that don't fit there.

## Theming

- Theme is CLASS-BASED ONLY: `html.light` / `html.dark`, persisted in
  `localStorage.theme`, applied by `apps/landing/src/app/theme-provider.tsx` (plus the
  pre-hydration inline script in `layout.tsx`). Never reintroduce
  `@media (prefers-color-scheme: dark)` CSS overrides in the landing app — a leftover
  create-next-app block did exactly that and half-darkened the site for dark-OS users
  who chose Light (fixed 2026-07-27).
- When QA'ing themes, test the full matrix: OS-scheme {light,dark} × site-theme
  {light,dark}. Mixed-theme bugs are invisible unless you emulate the OS scheme
  (Playwright `colorScheme`) — the maintainer's own machine only ever shows one half.

## Typography

- Fonts are Geist / Geist Mono via `next/font` variables consumed by the landing
  Tailwind config. The body must never hardcode a font stack — a leftover
  `body { font-family: Arial }` shipped the whole site in Arial for weeks
  (fixed 2026-07-27).
- apps/landing is **Tailwind v3.4**. Tailwind v4 syntax (`@theme`, `@variant`,
  fumadocs-ui) silently does nothing (or breaks) here — v4-style CSS in this app is
  dead code by definition. fumadocs-ui is FORBIDDEN (Tailwind v4 dependency).

## Docs pages

- Code blocks must scroll internally. The regression signal is page-level horizontal
  overflow at 390 px: `document.scrollingElement.scrollWidth > clientWidth` on any
  docs route is a bug (server-mode-setup shipped a 46 px bleed; fixed 2026-07-27).
- The docs sidebar/search/Ask-AI mount TWICE (hidden mobile `<details>` + desktop).
  Selector-driven tests must scope to `:visible` or they hit the hidden w=0 copy and
  clicks time out.
- `/docs-md/<slug>` serves a text/markdown mirror of every docs page.
- Ask AI requires the mastra backend env; it is configured on dev and streams
  docs-grounded answers. Locally without env it shows "isn't configured".

## Special pages

- `/mobile-demo` is a chromeless uploader embed canvas: no nav, no h1 — intentional.
  Exclude it from heading/landmark a11y sweeps.
- `/support` sends real email (UseSend). Don't spam it from automated tests.

## Deployed environments

- dev.useupup.com and dev-playground.useupup.com deploy from the `dev` branch via the
  Dokploy compose app (push to origin/dev → autodeploy). When polling a deploy, use a
  marker string that exists ONLY in the new build — old builds share most markup and
  will false-positive generic markers.
- dev-playground uploads are REAL (2026-07-27): the client presigns via its own
  `/api/upup/presign` (baked `NEXT_PUBLIC_UPUP_UPLOAD_ENDPOINT`) and PUTs directly to
  the Backblaze B2 dev bucket, whose existing `allowDevAccess` CORS rule permits any
  origin. Automated tests that upload should clean up their objects (S3 DeleteObject).
- The `@upupjs/server` handler REFUSES empty-string provider secrets at construct
  time, and a construct throw 500s EVERY route — including plain presign. App routes
  must only pass a provider when both its id and secret are set (fixed in both
  `/api/upup` routes, c2f53f6b); don't reintroduce an unconditional providers block.
  Google/OneDrive drive flows on the deployed compose stay off until their
  `*_CLIENT_SECRET` vars are added to the Dokploy env.
- The landing's own `/api/upup/presign` 404s (with `x-upup-request-id` present):
  `trailingSlash: true` 308-redirects the POST to `/presign/`, which the handler
  router doesn't match. Harmless while the landing demo is mock-only; fix belongs
  with the site-wide trailing-slash follow-up.

## Browser-automation traps on the dev box

- The Playwright-MCP Chrome profile can be left locked by a stale Chrome; identify
  strays by `ms-playwright-mcp` in the command line before killing anything. The
  chrome-devtools MCP intermittently drops with "Target closed" — retry once, then
  prefer a scripted Playwright run.
- pnpm's app-level `node_modules` junctions can be broken by OneDrive sync; when
  `createRequire` can't resolve a package that exists, require it by absolute path
  from `node_modules/.pnpm/<pkg>@<version>/node_modules/...`.
- Screenshots of semi-transparent fixed elements (glass nav) over animated content
  can look wrong mid-transition; verify with computed styles before filing visual
  bugs.

## Test-infrastructure quirks

- `@upupjs/next`'s `test:coverage` has a dts-emit race: its pretest build doesn't
  await tsup's `dist/server.d.ts` write before vitest starts, so the build-artifact
  spec can fail nondeterministically (observed 2026-07-27: spec read at :37, dts
  written at :42). Re-run isolated per the flake protocol before suspecting a change;
  a real fix is making pretest await the dts emit.
- The docs e2e suite shares `apps/landing/.next/dev/lock` with a running landing dev
  server — stop the dev server (and free its port) before running it, or it dies
  with "Unable to acquire lock".

## Known accepted behaviors (don't re-file)

- Marketing nav is translucent glass — scrolled content ghosts through it by design
  (docs routes use a solid nav).
- The homepage mock uploader plays a scripted scene loop; mid-scene captures show
  transient overlaps (drag hint over file rows). Not a defect.
- Docs Ask-AI drawer open/close animates the content container (300 ms) and shifts
  the page mid-transition — logged follow-up, not a standing bug.
