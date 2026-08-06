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
- Server-mode drive OAuth is LIVE on the deployed compose for ALL FOUR
  providers — Google Drive + Dropbox (2026-07-28), Box + OneDrive
  (2026-07-30): every `/api/upup/auth/<provider>` 302s to its IdP on both
  origins. Both routes wire `InMemoryTokenStore` (203e4324) — demo-grade,
  per-process, sessions reset on container restart — and pass
  `trustProxy: true` (1f96820f) — without it, `req.url` inside the container
  is localhost:3000 and the derived OAuth `redirect_uri` pointed at
  localhost; Traefik's `x-forwarded-*` supplies the public origin per-domain.
  The provider app registry (all verified — server `/cb` URIs registered AND
  authorize URLs accepted; the consent click itself stays human-only, never
  automate it):
    - Google: client `716672485589-…vs5lr5`, GCP project OAuthAppUpUp.
    - Dropbox: app **upup-oauth `6rcdlj7qhxh9yku`**. The former app
      `8oqtlukxuuatirk` belongs to an account the maintainer cannot access —
      do NOT switch back to it.
    - Box: app **upup-oauth (id 2636865)** on the maintainer's Box account.
      That account's other app ("Default App") is the Client Credentials
      drive-sandbox service account — CCG cannot run the user-facing
      auth-code flow, so never point BOX_CLIENT_ID at it.
    - OneDrive: Azure app registration **upup-oauth
      `90da7d0a-280a-4efc-83f5-d4098dfc4145`** in the devino.ca tenant,
      signInAudience AzureADandPersonalMicrosoftAccount (the `/common`
      endpoint needs that tier), delegated Files.Read.All + offline_access
      admin-consented. The OLD id `99ee7f72` is homed under the personal
      account amin.devino@outlook.com — uneditable from devino.ca, do NOT
      switch back. `upup-sandbox` (`3b0c48b2`) is the nightly CI harness
      app — never add production URIs to it.
      CLIENT-mode popup redirects are registered too (2026-07-30): the popup
      plugins redirect to `<origin>/box_redirect` / `/dp_redirect` /
      `/od_redirect` (SPA platform on Azure), all registered for both origins on
      the respective apps — a 404 page there is fine, the plugin only polls the
      popup URL for the code. Drive TILES grey out when their
      `NEXT_PUBLIC_*_CLIENT_ID` build arg is empty — and a public provider
      var must land in the FULL chain or it silently stays '' in the bundle:
      app env schema (`src/lib/env.ts`, BOTH apps) → `Dockerfile.landing`
      AND `Dockerfile.playground` ARG+ENV → both compose services'
      `build.args` → Dokploy env build-time section → rebuild. Box shipped
      with only the playground half wired (fixed d9281f93 — the landing demo
      kept a greyed Box tile for a day). Since d9281f93 the landing demo also
      seeds `sources` with every credentialed drive (mirrors the playground)
      so configured providers are ON by default.
      Console-automation notes: the master browser profile's Box/portal logins
      expire — a login wall mid-task means STOP and ask the human; on the
      Dropbox console `type_text` can land zero characters (read back `.value`,
      fall back to paste), and its app URL must be the query-param form
      `developers/apps/info?app_key=…` (the path form 302s to login even when
      authenticated).
- Landing `/api/upup/*` works THROUGH the trailingSlash 308 since 811f32da: Next
  308s POST `/presign` to `/presign/` (method+body preserved) and the
  `@upupjs/server` router now matches the slash-stripped path (it used to 404 —
  landing uploads and drive OAuth were both dead on the deployed site). The
  canonical/OG/sitemap/JSON-LD base URL is `src/lib/site-url.ts` (siteUrl /
  canonicalUrl) — never hardcode `https://useupup.com` in a new surface.
- New-runtime-env-var trap: `deploy/site/docker-compose.yml` WHITELISTS runtime
  env per service (bare list form). Saving a var in the Dokploy compose env
  alone never reaches the containers — it must ALSO be added to BOTH services'
  `environment:` lists. Symptom is silent: the deploy goes green and the app
  behaves exactly as if the var were unset (Box burned 25 min on this,
  df9b8721).
- Deploy-poll marker trap: metadata-derived markers are NOT proven-new — Next
  normalizes canonical/sitemap URLs under `trailingSlash: true`, so the OLD build
  already emitted slashed canonicals and a canonical-slash marker false-positived.
  Behavioral flips (a status code that only the new code can produce) are the
  reliable markers.
- Deploys can hang (not abort) at "Corepack is about to download pnpm" — a registry
  network stall with no timeout; one sat `running` 45+ min with a byte-frozen log.
  Diagnose via `ssh root@devino "tail .../compose-*.log"`; remediate with Dokploy
  compose-killBuild + compose-redeploy of the same commit (second attempt built
  clean in ~7 min).

## Browser-automation traps on the dev box

- The Playwright-MCP Chrome profile can be left locked by a stale Chrome; identify
  strays by `ms-playwright-mcp` in the command line before killing anything. The
  chrome-devtools MCP intermittently drops with "Target closed" — retry once, then
  prefer a scripted Playwright run.
- Windows itself can refuse to start ANY Chrome ("Your computer has run out of
  resources", instant exit code 37) when the session has leaked thousands of
  processes (psmux trees, orphaned MCP servers). Every local browser MCP fails
  identically then; killing provable orphans (dead parent, automation names only,
  never python/claude/user sessions) is the only safe local remedy — otherwise run
  the browser elsewhere. Observed at 2,769 processes (2026-08-06).

### stealth-chrome-devtools MCP specifically (2026-08-06 sweep)

- `execute_script` does NOT await returned Promises — a Promise body yields
  `result: null`, which reads as a broken page. Sample over time by stashing into
  `window.__x` with `setInterval` in one call and reading it back in a later call.
- `query_elements` text extraction leaks Chrome's video-control shadow tree, so a
  live `<video>` appears to ship `controls` (with a Download button). Read
  `video.controls` as a property before filing that bug.
- A loaded StackBlitz embed has `src === ""` and zero parent-document resource
  entries (the SDK form-POSTs into a NAMED iframe). Verify visually, not by src.
- Duplicate mobile trigger copies (docs search / Ask AI) mean selectors match
  multiple elements and the FIRST is the invisible one — always filter by a
  non-zero bounding rect (complements the `:visible` rule above).
- Clicking `Share Screen` (getDisplayMedia) can drop the MCP connection for
  exactly one call; the instance survives — re-query, don't respawn.
- Synthetic `element.click()` from `execute_script` does not drive React handlers
  (hero beat chips ignore it even when healthy). Use the trusted `click_element`
  tool before concluding a control is dead.
- The CDP `Emulation` domain is absent (`setEmulatedMedia`,
  `setDeviceMetricsOverride` → "Unknown CDP command"); `execute_cdp_command`
  proxies Runtime only. Reduced motion: spawn with `--force-prefers-reduced-motion`.
  True sub-500px mobile is IMPOSSIBLE — Chrome-on-Windows clamps window width to
  ~500 CSS px, so "mobile" sweeps are 500px sweeps; note it in coverage claims.
- `take_screenshot` `full_page:true` is a NO-OP (always viewport). Scroll-ladder
  and stitch; before stitching, inject `*{scroll-behavior:auto!important}` (the
  site sets smooth scrolling, so `scrollTo` doesn't land synchronously), and
  remember `location.reload()` RESTORES scroll position — `scrollTo(0,0)` after
  every theme-flip reload or your "hero" shot is the footer.
- `create_persistent_function` dies (`Connection closed`) around ~4KB of body.
  Workaround: stash the source in `localStorage` (per-origin — navigate first)
  and `eval()` it per page.
- PowerShell stitching: `Measure-Object` returns Double and
  `New-Object System.Drawing.Bitmap($w,$h)` rejects it — cast `[int]`. Never let
  a stitch script delete source segments before verifying the output isn't blank.

### Subagent-orchestration quirks (this harness)

- Subagents are BLOCKED from writing report `.md` files ("return findings as
  text") — data files (.json, scripts, screenshots) write fine. The orchestrator
  must persist narrative reports itself, and completion notices do NOT relay the
  report body — ask the agent to resend as message text if it only "completed".
- Idle notifications fire even when the agent never started the assignment.
  Verify on disk (`git status`) and nudge with the evidence; both silent-idlers
  this sweep started immediately after one nudge.
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
