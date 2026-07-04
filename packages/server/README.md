# @upup/server

Server-mode endpoints for [upup](https://github.com/upup-dev/upup): S3/MinIO
presign + proxy upload, drive-token exchange (Google Drive / OneDrive /
Dropbox / Box), and an HMAC-signed upload-token trust model so the client
never asserts the object key or S3 `uploadId` it's writing to.

`createUpupHandler(config)` returns a framework-agnostic `(req: Request) =>
Promise<Response>`. Thin adapters wire it into Express, Fastify, Hono, and
Next.js (`@upup/server/express`, `/fastify`, `/hono`, `/next`).

## Install

```sh
npm install @upup/server
```

## Minimal config

```ts
import { createUpupHandler } from '@upup/server'

const handler = createUpupHandler({
  storage: {
    type: 'aws',
    bucket: 'my-bucket',
    region: 'us-east-1',
    // accessKeyId/secretAccessKey — omit to use the environment's default
    // AWS credential chain. Set `endpoint` (+ optionally `forcePathStyle`)
    // for MinIO / R2 / DigitalOcean Spaces / any S3-compatible provider.
  },
  uploadTokenSecret: process.env.UPUP_UPLOAD_TOKEN_SECRET,
})
```

### `uploadTokenSecret` is REQUIRED — and must match across every instance

`createUpupHandler` throws at construction time if `uploadTokenSecret` is
missing or under 16 characters. This secret HMAC-signs the stateless upload
token issued at multipart-init and re-verified on every sign-part / complete
/ abort call — it is what binds the client-supplied token to the
server-chosen object key and S3 `uploadId` so a client can never assert
either on the way back.

**It must be byte-for-byte identical on every server instance / worker /
lambda that can see the same upload.** A rolling redeploy that generates a
fresh secret per instance (or a mismatched secret between regions/canaries)
means requests routed to a different instance than the one that issued the
token fail multipart uploads with `403 bad_signature` — indistinguishable
from a real forgery unless you know to check this. Generate one secret and
inject it as a shared config value (env var / secret manager), e.g.:

```sh
openssl rand -hex 32
```

See [`/health`](#health) below for a way to detect this drift across a fleet
without comparing the secret value directly.

## Error codes

Every non-2xx JSON response body is `{ error: <generic human message>, code:
<machine code> }`. The human message is safe to log/display as-is; the
`code` is the stable value to branch on (retry logic, alerting, i18n
mapping). The real exception detail (name/message/stack) is **never** sent
to the client — it goes only to the [`onError`](#onerror-logging-seam) seam.

| `code` | Where it comes from | Typical cause |
|---|---|---|
| `PRESIGN_FAILED` | `POST /presign` 500 | Storage provider rejected the presign call |
| `STORAGE_ERROR` | multipart init/sign-part/complete/abort 500, drive list/transfer 500, uncaught router error | S3/MinIO call failed, or an unhandled exception anywhere in routing |
| `BAD_REQUEST` | any route, 400 | Empty body, malformed JSON, or invalid file metadata (missing/wrong-typed `name`/`type`/`size`) |
| `AUTH_DENIED` | (reserved) | — |
| `AUTH_PROVIDER_ERROR` | OAuth token exchange, 502 | The provider's token endpoint rejected the code/refresh-token exchange |
| `AUTH_EXPIRED` | drive token refresh failure (internal) | Refresh token dead/revoked — forces a clean re-auth |

Upload-token verification failures (multipart sign-part/complete/abort) are
a separate, narrower vocabulary — always `403` — because they describe the
token itself, not a storage/auth outcome:

| Token `code` | Meaning |
|---|---|
| `malformed` | Token isn't the expected `body.signature` shape, or its payload is missing required fields |
| `bad_signature` | Token is well-shaped but the HMAC signature doesn't verify (wrong/rotated secret, or tampering) |
| `expired` | Token's `exp` claim is in the past |

On the client, `@upup/core`'s upload strategies read these bodies and
construct typed errors (`UpupStorageError` / `UpupAuthError`) carrying the
same `.code`, and `errorCodeToMessageKey()` maps a code to an i18n catalog
key for display.

## `onError` — the logging seam

```ts
createUpupHandler({
  // ...
  onError(event) {
    // event: { route, method, status, code, message, requestId?,
    //          error?: { name, message, stack? } }
    myLogger.error('upup-server', event)
  },
})
```

Called on every error path (500s, invalid upload tokens, OAuth/token-exchange
failures, health-check storage failures). **Guaranteed never to receive**
request bodies, tokens, `uploadTokenSecret`, S3 credentials, signatures, or
`Authorization` headers — only a static route string, the HTTP method,
status, machine `code`, a generic message, and the caught error's
`name`/`message`/`stack`.

If you don't supply `onError`, the default logs one structured line via
`console.error('[upup:server]', JSON.stringify(event))` — so error visibility
is on by default, not something you have to wire up before your first
incident. Override it to ship events to Datadog/Sentry/your own sink, or
supply a no-op to silence it.

## `/health`

```sh
curl https://your-app.example.com/api/upup/health
```

```json
{ "status": "ok", "checks": { "config": "ok", "storage": "ok" } }
```

Unauthenticated (checked **before** `config.auth`, so uptime/deploy probes
work without credentials) and always responds `200` — it's liveness-friendly;
the `status`/`checks` fields carry the actual health signal rather than the
HTTP status code, so an orchestrator doesn't restart a container over a
transient S3 blip. `checks.config` is `'ok'` when `storage.bucket`,
`storage.region`, and a valid-length `uploadTokenSecret` are all present;
`checks.storage` is a cheap `HeadBucketCommand` probe (no object
listing/transfer), TTL-cached for 30 seconds so repeated polling doesn't
hammer the real provider. A storage-check failure also fires the `onError`
seam.

### Spotting cross-instance secret drift

Opt in to a fingerprint of `uploadTokenSecret` (never the secret itself):

```ts
createUpupHandler({ /* ... */, health: { exposeSecretFingerprint: true } })
```

```json
{ "status": "ok", "checks": { ... }, "uploadTokenFingerprint": "a1b2c3d4" }
```

`uploadTokenFingerprint` is the first 8 hex characters of
`SHA-256(uploadTokenSecret)` — a 32-bit, non-reversible fingerprint over a
≥128-bit secret. Curl `/health` on each instance behind your load balancer;
if the fingerprints differ, some instances are running with a different
secret than others (the exact rolling-redeploy hazard described above), and
you'll see `bad_signature` errors that look like forgery but aren't.
Consider network-ACLing this route if you'd rather not expose even the
fingerprint publicly.

## `TokenStore` — bring your own in production

```ts
import { InMemoryTokenStore } from '@upup/server'
```

**`InMemoryTokenStore` is DEV-ONLY.** It is a zero-dependency reference
implementation useful for local development, demos, and quick prototypes —
and unsuitable for production for three reasons:

1. **Lost on restart.** All OAuth drive tokens and pending OAuth state
   evaporate the moment the process restarts or redeploys.
2. **Not shared across workers.** Each process/worker/lambda has its own
   independent `Map`; a request handled by a different instance than the one
   that stored the token sees it as missing (a spurious re-auth prompt).
3. **Grows unbounded.** Nothing evicts stale entries beyond their own TTL
   expiry logic — there is no capacity bound.

Ship a `TokenStore` backed by Redis, Cloudflare KV, or your own
database/table for any real deployment. The interface is intentionally
narrow (`get`/`set`/`delete`, string-keyed, optional TTL) to match common KV
stores directly:

```ts
export interface TokenStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds?: number): Promise<void>
  delete(key: string): Promise<void>
}
```

## License

MIT
