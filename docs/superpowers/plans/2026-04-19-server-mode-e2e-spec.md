# Server Mode — Playwright E2E Spec (scoped)

**Status:** scoped, not implemented. The v1 E2E harness
(`packages/upup/server/index.js` + `dev:server` + `/health` endpoint)
was retired along with packages/upup in v2.1 (commit `ce5b2ed`). A new
harness must be wired before these specs can run.

## Prerequisites to re-enable

1. **Test server.** A minimal mock Server Mode endpoint mounted in the
   interactive-example app (or a dedicated `apps/e2e-harness/`) that:
   - Mounts `createHandler()` from `@upup/server` at `/api/upup`
   - Uses `InMemoryTokenStore` and a fixture `getUserId`
   - Mocks drive providers: return a canned folder tree on
     `/files/:provider`, accept `/files/:provider/transfer` but
     route to a MinIO container for storage
   - Exposes `/test/seed-tokens` to pre-populate tokenStore so popup
     flow can short-circuit auth in most specs
2. **Playwright config.** `packages/interactive-example/playwright.config.ts`
   with `webServer: { command: 'pnpm dev', url: 'http://localhost:3004' }`
   matching playground dev server port.
3. **CI re-integration.** Re-add a pruned version of the E2E job in
   `.github/workflows/main.yml`, dropping the v1 S3 secrets since
   MinIO is bundled as a service container.

## Specs to write

### `server-mode/popup-oauth.spec.ts`

Covers the popup-based OAuth flow that's unique to Server Mode.

```ts
test('Google Drive sign-in popup resolves picker on postMessage', async ({ page, context }) => {
  await page.goto('/?mode=server&serverUrl=/api/upup')
  await page.click('[data-upup-slot="adapter-button-google-drive"]')

  // The component opens a popup at /api/upup/auth/google-drive
  const popupPromise = context.waitForEvent('page')
  const popup = await popupPromise
  await popup.waitForLoadState('domcontentloaded')

  // Harness auto-completes OAuth on callback and posts the message
  // that closes the popup + re-runs list()
  await page.waitForSelector('[data-upup-slot="drive-browser-item"]')
  await expect(page.locator('[data-upup-slot="drive-browser-header"]'))
    .toContainText('Google Drive')
})
```

Assertions:
- Popup opens, closes after the harness sends
  `postMessage({type:'upup:oauth-success', provider:'google-drive'})`
- The picker re-runs list() after popup closes
- File rows appear (fixture returns ≥1 file)

### `server-mode/reauth.spec.ts`

Covers the 401 → reauth fallback UI.

```ts
test('expired token surfaces DriveAuthFallback with sign-in retry', async ({ page }) => {
  // Seed a stale token; fixture provider returns 401 on list()
  await page.goto('/api/upup/test/seed-tokens?provider=dropbox&scenario=expired')
  await page.goto('/?mode=server&serverUrl=/api/upup')
  await page.click('[data-upup-slot="adapter-button-dropbox"]')

  // Hook detects 401, shows fallback
  await expect(page.locator('[data-upup-slot="drive-auth-fallback"]'))
    .toBeVisible()
  // User clicks Sign In → triggers popup flow (covered in popup-oauth.spec.ts)
})
```

### `server-mode/transfer.spec.ts`

Covers the browser → server → S3 transfer path.

```ts
test('selecting files triggers /files/:provider/transfer POST', async ({ page }) => {
  await page.goto('/api/upup/test/seed-tokens?provider=google-drive&scenario=valid')
  await page.goto('/?mode=server&serverUrl=/api/upup')
  await page.click('[data-upup-slot="adapter-button-google-drive"]')
  await page.waitForSelector('[data-upup-slot="drive-browser-item"]')

  await page.locator('[data-upup-slot="drive-browser-item"]').first().click()
  const transferReq = page.waitForRequest(r =>
    r.url().includes('/files/google-drive/transfer') && r.method() === 'POST'
  )
  await page.click('text=Add files')
  await transferReq

  // Backend returns the uploaded shape; uploader emits onFileUploadComplete
  await expect(page.locator('[data-upup-slot="file-list-item"]')).toBeVisible()
})
```

### `server-mode/multipart-threshold.spec.ts`

Covers the 100 MB threshold branch.

```ts
test('large drive file triggers server-side S3 multipart path', async ({ page }) => {
  // Fixture returns a 200MB Google Drive file (the harness just reports size)
  await page.goto('/api/upup/test/seed-tokens?provider=google-drive&scenario=large')
  await page.goto('/?mode=server&serverUrl=/api/upup')
  await page.click('[data-upup-slot="adapter-button-google-drive"]')
  await page.locator('[data-upup-slot="drive-browser-item"]').first().click()

  // Harness spies multipart calls and exposes them at /test/multipart-log
  await page.click('text=Add files')
  const log = await (await page.request.get('/api/upup/test/multipart-log')).json()
  expect(log).toEqual(expect.objectContaining({
    multipartUsed: true,
    partCount: expect.any(Number),
  }))
})
```

## Out of scope for this spec

- Real Google/Microsoft/Dropbox/Box OAuth round-trips. Fixture the
  provider API responses — real OAuth belongs in a manual smoke test
  before each release, not CI.
- Cross-browser matrix. Chromium-only for v2.2. Firefox/WebKit once
  Server Mode is battle-tested.
- Load testing. Unit tests already cover multipart chunk boundaries.
