# v2.2 — Client Mode / Server Mode

**Date:** 2026-04-19
**Supersedes:** `2026-04-02-plan4-server-strategies.md` (6-strategy model)
**Target release:** `upup-react-file-uploader@2.2.0`

---

## Why reframe

The old plan proposed six named "strategies" (TokenEndpoint, DirectUpload,
ServerCredentials, ClientOAuth, ServerOAuth, ServerTransfer,
MultipartUpload). In practice these collapse into two mental models,
matching Uppy's `Core` vs `Companion` split:

| Mode | Flow | Sub-paths folded in |
|---|---|---|
| **Client Mode** | Browser ↔ storage, server only signs | TokenEndpoint, DirectUpload, ClientOAuth, client-driven Multipart |
| **Server Mode** | Browser → consumer server → storage | ServerCredentials, ServerOAuth, ServerTransfer, server-driven Multipart |

One `mode` prop on `UpupUploader` picks the lane. Everything else
(restrictions, theme, providers, events) is mode-agnostic.

## Package boundary (confirmed)

- **`@upup/react`** — all React + browser code. Never imports
  `@upup/server`. Must tree-shake cleanly for Client Mode so Server Mode
  doesn't bloat the client bundle.
- **`@upup/core`** — isomorphic TS (no DOM, no Node-only APIs at import
  time). Upload state machine, restriction validators, ICU i18n
  resolution, hash helpers. Usable from either browser or Node.
- **`@upup/server`** — Node-only. Express / Fastify / Hono / Next
  adapters around a framework-agnostic `createHandler(req: Request)`.
  Depends on `@upup/core`.
- **`@upup/shared`** — dependency-free types, theme slot definitions,
  ICU messages. Zero runtime imports beyond types + pure helpers.

This layout is **already** what we have — no restructuring needed.

---

## Current state

### Client Mode: ✅ works

- `UpupUploader` posts to `tokenEndpoint` → receives presigned URL → PUTs.
- Cloud-drive adapters (GDrive, OneDrive, Dropbox, Box) have browser OAuth
  flows when consumer provides OAuth client IDs as props.
- Client-driven multipart works against any S3-compatible provider.

### Server Mode: ⚠️ 60% scaffolded, ~40% TODOs

`packages/server/src/handler.ts` already routes:

| Route | Status |
|---|---|
| `POST /presign` | ✅ done |
| `POST /multipart/init`, `/sign-part`, `/complete`, `/abort` | ✅ done |
| `GET /auth/:provider` | ✅ redirects to provider OAuth |
| `GET /auth/:provider/cb` | ⚠️ stub — TODO: exchange code for tokens |
| `GET /files/:provider` | ⚠️ stub — TODO: list files from drive API |
| `POST /files/:provider/transfer` | ⚠️ stub — TODO: server-side transfer |

Three TODOs in `handler.ts` (lines 249, 274, 297) are what's missing.

The client side has **no** wiring for server-mode drive browsing — the
cloud adapters always speak directly to Google/Microsoft/Dropbox from the
browser. Server Mode needs the adapters to route drive calls through the
consumer's `/files/:provider` endpoint instead.

---

## Public API (v2.2)

```tsx
<UpupUploader
  mode="client"   // default — today's behaviour
  tokenEndpoint="/api/upload/sign"
/>

<UpupUploader
  mode="server"
  serverUrl="/api/upup"   // base path where createHandler() is mounted
/>
```

One prop. `client` is the default; existing consumers need no change.
When `mode="server"`, the uploader stops making direct drive API calls
and talks only to `serverUrl`. The server decides everything downstream.

On the server side:

```ts
import { createHandler } from 'upup-server'

export const POST = createHandler({
  storage: { provider: 'aws', bucket, region, credentials },
  providers: {
    googleDrive: { clientId, clientSecret },
    oneDrive:    { clientId, clientSecret },
    dropbox:     { appKey,   appSecret    },
  },
  tokenStore: /* consumer's token persistence */,
  hooks: { onBeforeUpload, onUploadComplete },
})
```

The `tokenStore` contract is what the consumer plugs in (Redis, their
DB, whatever) so we never hold user tokens in memory.

---

## Scope (what ships in v2.2)

### 1. Finish the 3 TODOs in `handler.ts`

**OAuth callback** — exchange authorization code for access + refresh
tokens, call `config.tokenStore.save({ userId, provider, tokens })`, then
redirect the browser back to the uploader with `?auth=success`. Per
provider: Google, Microsoft Graph, Dropbox v2.

**`GET /files/:provider`** — read tokens from `tokenStore`, call
`drive.files.list` / `DriveItem/children` / `list_folder`, normalise into
a common `{ id, name, size, mimeType, thumbnailUrl, isFolder }[]`, return.

**`POST /files/:provider/transfer`** — stream the file from the drive
API directly to S3 via multipart. No bytes through the client. Memory-
bounded (chunk stream, don't buffer the whole file).

### 2. Wire `mode` prop on client side

`UpupUploader` → `useRootProvider` → cloud-drive hooks. When `mode ===
'server'`, drive hooks swap their fetch targets: `/files/google-drive`
instead of `googleapis.com/drive/v3/files`, etc. Upload path swaps
`tokenEndpoint` → `${serverUrl}/presign`.

Keep Client Mode fully functional if `mode` is omitted — no regressions.

### 3. `tokenStore` contract

Published interface + an in-memory reference impl for dev, plus a
Redis example in docs. Nothing fancy; just `save` / `get` / `delete`.

### 4. Tests

- Server: unit per route + an integration test per provider using nock
  against Google/Microsoft/Dropbox mocks.
- Client: one Playwright spec per mode (`mode="client"` already
  covered; add `mode="server"` happy path with a mock upup-server).
- Bundle-size: assert `@upup/server` is not in the client bundle.

### 5. Docs

- `apps/docs/docs/guides/modes.md` — Client vs Server decision guide.
- `apps/docs/docs/guides/server-mode-setup.md` — step-by-step.
- Playground gets a `mode` toggle in the Advanced category.

---

## Out of scope (v2.3+)

- Companion-style self-hosted backend as a separate npm (users run
  `@upup/server` inside their own app; we don't ship a daemon).
- Pre-built OAuth consent UIs (consumer handles their own sign-in chrome).
- Server-side image editing / compression.

---

## Estimates

| Chunk | Est |
|---|---|
| 1. OAuth callbacks (3 providers) | 3 hr |
| 2. `/files/:provider` list (3 providers) | 2.5 hr |
| 3. `/files/:provider/transfer` streaming | 2 hr |
| 4. Client `mode` prop wiring | 2 hr |
| 5. `tokenStore` interface + reference | 30 min |
| 6. Tests (server + client + bundle) | 3 hr |
| 7. Docs + playground toggle | 1 hr |

**Total: ~14 hr.** Roughly a 2-day sprint, not a v2.1 item.

---

## Decisions (locked 2026-04-19)

### 1. Multipart: threshold-based on outbound side only

```ts
createHandler({
  multipartThreshold: 100 * 1024 * 1024,  // 100 MB default, configurable
})
```

- **Inbound (drive → server):** always streaming GET. Drive APIs don't
  offer meaningful resume; if the connection dies, fail the transfer
  and let the consumer re-pick.
- **Outbound (server → S3), file < threshold:** single streamed PUT.
- **Outbound (server → S3), file ≥ threshold:** S3 multipart. Chunks
  sized to the `chunkSizeBytes` config (default 5 MB). Memory envelope:
  one chunk at a time, so ~5-10 MB resident per concurrent transfer.

### 2. Our picker UI for all 4 providers

Google, Microsoft, Dropbox, **and Box** render through our own React
picker talking to `/files/:provider` on the consumer's upup-server
mount. Box's hosted widget is retired in Server Mode. This means a
one-time rewrite of the Box adapter against Box's Content API
(`GET /2.0/folders/:id/items`, `GET /2.0/files/:id/content`) — ~3-4 hr,
included in the estimate.

Rationale: consistent browser UX across all drives is worth more than
the code saved by reusing Box's widget.

### 3. No refresh tokens — re-sign-in on 401

We do not persist refresh tokens. On any 401 from a drive API call:

- Server deletes the expired access token from `tokenStore`.
- `/files/:provider` responds with `401 { reauth: true, provider }`.
- Client surfaces the adapter's existing "Sign in with {provider}"
  state. User clicks once, re-auths, the app resumes.

Tradeoffs accepted:
- Simpler — no refresh-token storage, no background cron, works on
  Vercel / Lambda / Workers unchanged.
- More secure — smaller blast radius if `tokenStore` ever leaks.
- A 90-min server-mode transfer *could* 401 mid-way. If that happens,
  the user re-auths and re-picks; the transfer restarts. Accepted edge
  case — rare in practice (tokens typically last 1 hr from issuance).
