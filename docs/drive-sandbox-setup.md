# Cloud-drive sandbox setup

The runbook for standing up disposable cloud-drive **sandbox** accounts so the
live integration suite can run against real Box, Dropbox, Google Drive, and
OneDrive APIs. CLAUDE.md holds the repo-wide process rules and `docs/testing.md`
is the testing deep-dive; this file is the one place that walks the account
setup end to end.

The suite is
`packages/server/tests/integration/drive-clients-live.integration.test.ts`. It
exercises `packages/server/src/drive-clients.ts` for real: list a folder,
navigate it, search, and download each seeded fixture, then verify the
downloaded bytes are a byte-exact sha256 match of the committed fixture on disk.
That is the coverage the mocked unit tests cannot give — a real credential, a
real HTTP round-trip, real bytes back.

## Ground rules — read first

- **Sandbox only.** Every account, OAuth app, and bucket here is a
  **disposable throwaway created solely for CI**. Never use a production
  account, a real user's account, real customer data, a production OAuth app,
  or a production storage bucket.
- **Secrets never get committed.** They live in exactly two places: GitHub
  Actions repo secrets (for CI) and a local, gitignored `local-dev/.env.test`
  (for your own runs). `.gitignore` ignores `.env.*` and only un-ignores the
  `.example` template, so `local-dev/.env.test` can never be staged by
  accident. Do not paste a token into a commit, a PR, an issue, or a chat.
- **One human click, once.** For every provider except Box, the only
  interactive step is _you_ clicking **Allow** a single time in _your own_
  browser during the one-time mint. We never automate a provider login and
  never type credentials into a provider's page — that is repo policy. (Box has
  no consent screen at all; see its section.)
- **PR CI needs none of this.** No pull-request check reads these credentials.
  The live suite runs only in `nightly.yml`'s `Drive-Sandbox` job, and only
  when the secrets are present. With no secrets the job **skips green** with a
  notice; `drive-clients.ts` stays covered by its mocked unit tests. Any single
  provider you leave unconfigured skips individually inside the suite — you can
  wire up one provider today and the rest later.

## Overview — the token model per provider

Each provider hands back a long-lived credential once, and after that the
nightly job authenticates with no human in the loop. What "long-lived" costs you
differs per provider:

| Provider     | Token model                | Maintenance             |
| ------------ | -------------------------- | ----------------------- |
| Box          | Client Credentials Grant   | None                    |
| Dropbox      | Non-expiring refresh token | None                    |
| Google Drive | Stable refresh token       | Nightly keeps it warm   |
| OneDrive     | Rotating refresh token     | Nightly rotates it back |

- **Box** uses a Client Credentials Grant (a service account — no user, no
  refresh token). Zero ongoing maintenance: the nightly job mints a fresh
  access token from the client id/secret every run.
- **Dropbox** issues a refresh token that never expires. Zero maintenance once
  minted.
- **Google Drive** issues a stable refresh token. Google revokes a refresh
  token only after six months of inactivity, so the nightly run doubles as its
  keep-warm heartbeat.
- **OneDrive** is the awkward one: Microsoft **rotates** the refresh token on
  every use (a new one is issued and the old one invalidated), on a 90-day
  sliding inactivity window. The nightly job therefore rotates it and writes
  the new value back to the repo secret automatically — which needs one extra
  credential, a secrets-write PAT (see the CI section).

## Common setup

Everything below assumes Node 20.20.2 / pnpm 10.11.0 (the repo defaults) and
that you are at the repo root.

1. Copy the template to the gitignored local env file:

    ```bash
    cp local-dev/.env.test.example local-dev/.env.test
    ```

    Keep `UPUP_DRIVE_SANDBOX=1` at the top — the live suite is inert unless this
    is exactly `1`, even when the secrets are present. That keeps `pnpm test`
    hermetic.

2. **Register one redirect URI, identically, in every OAuth app** that has a
   consent flow (Dropbox, Google Drive, OneDrive). It must be exactly:

    ```
    http://localhost:53682/callback
    ```

    The mint CLI runs a throwaway localhost listener on port `53682` to catch
    the redirect. Box needs no redirect URI (it has no consent step).

3. For each provider, the one-time flow is the same four moves:

    ```bash
    # 1. put the app's client id / secret into local-dev/.env.test (see below)
    # 2. mint the refresh token — opens your browser; you click "Allow" once
    pnpm run drive:sandbox:mint <provider>
    # 3. paste the printed refresh token back into local-dev/.env.test
    # 4. seed fixtures into every configured account, then run the suite
    pnpm run drive:sandbox:seed all
    pnpm run drive:sandbox:test
    ```

    `<provider>` is the wire-form slug: `box`, `dropbox`, `google-drive`, or
    `one-drive`. **Box skips steps 2–3** — it has no refresh token to mint; fill
    its three env vars and go straight to `seed`.

The three scripts are thin dotenv wrappers (they load `local-dev/.env.test`):
`drive:sandbox:mint` runs the one-time consent CLI, `drive:sandbox:seed` uploads
the fixture set, and `drive:sandbox:test` builds `@upup/core` and runs the gated
vitest suite.

### What gets seeded, and why write scope is required

`seed.mjs` creates a folder named `upup-sandbox-fixtures` in each account's root
and uploads two committed fixtures into it: `upup-sandbox-hello.txt` (UTF-8 text
with a multibyte character) and `upup-sandbox-bytes.bin` (a 256-byte 0x00–0xFF
blob). Together they prove the list→download path is byte-exact for both text
and non-textual binary. The suite discovers the per-account file IDs at runtime
by listing the folder and matching on name — no file IDs are ever committed.

Note the asymmetry: the shipped `drive-clients.ts` only ever **reads** (list and
download). But seeding has to **create** those fixtures, so the one-time consent
must grant **write** scope. That is why each provider's sandbox scopes below are
write-inclusive even though production drive access is read-only.

## Provider: Box

- **Console:** [Box Developer Console](https://app.box.com/developers/console)
  (a free Box developer account).
- **App type:** a **Custom App** using **Server Authentication (Client
  Credentials Grant)**. This is a service account — there is no user login and
  no refresh token.
- **Scopes / permissions:** under the app's **Configuration**, give it
  **read + write access to all files and folders** (write is needed for
  seeding). Then an admin must **authorize the app** in the Box Admin Console
  (Apps → Custom Apps Manager → authorize by the app's Client ID). Copy the
  **Enterprise ID** from the admin console's account settings.
- **Redirect URI:** none — CCG has no consent flow.
- **Env vars** (into `local-dev/.env.test`):

    ```
    UPUP_TEST_BOX_CLIENT_ID=
    UPUP_TEST_BOX_CLIENT_SECRET=
    UPUP_TEST_BOX_ENTERPRISE_ID=
    ```

- **Mint:** skip it. There is no `drive:sandbox:mint box` step — the access
  token is minted on demand from the three vars above. Fill them, then run
  `pnpm run drive:sandbox:seed all`.

## Provider: Dropbox

- **Console:** [Dropbox App Console](https://www.dropbox.com/developers/apps).
- **App type:** a **Scoped App**. **App Folder** access is recommended — it
  sandboxes the app to its own folder, which is exactly what we want.
- **Scopes / permissions:** on the app's **Permissions** tab enable:

    ```
    files.content.write files.content.read files.metadata.read account_info.read
    ```

    (`files.content.write` is the seeding scope.) The mint flow requests offline
    access so Dropbox returns a durable, non-expiring refresh token.

- **Redirect URI:** add `http://localhost:53682/callback` under the app's
  **OAuth 2 → Redirect URIs**.
- **Env vars:**

    ```
    UPUP_TEST_DROPBOX_APP_KEY=
    UPUP_TEST_DROPBOX_APP_SECRET=
    UPUP_TEST_DROPBOX_REFRESH_TOKEN=    # paste from the mint output
    ```

- **Mint:** put the app key/secret in place, then:

    ```bash
    pnpm run drive:sandbox:mint dropbox
    ```

    Click **Allow**, then paste the printed refresh token into
    `UPUP_TEST_DROPBOX_REFRESH_TOKEN`.

## Provider: Google Drive

- **Console:**
  [Google Cloud Console](https://console.cloud.google.com/apis/credentials) in a
  throwaway project. Enable the **Google Drive API** for the project.
- **App type:** an OAuth **client**. A **Desktop app** client is simplest —
  Google allows loopback redirects for it, so you don't have to fight redirect
  registration. (A Web application client works too; if you use one, register
  the redirect URI below.)
- **Scopes / permissions:** the single scope
  `https://www.googleapis.com/auth/drive.file`. This is the **non-sensitive**
  Drive scope — the app can only see and manage files it created itself (exactly
  our seeded fixtures), and it needs **no Google verification**. On the OAuth
  consent screen set the publishing status to **In production** (not
  **Testing**). "In production" is fine unverified for this non-sensitive scope,
  and it matters for token durability — a Testing-status app issues refresh
  tokens that expire after 7 days.
- **Redirect URI:** for a Web application client, add
  `http://localhost:53682/callback` to the authorized redirect URIs. (Desktop
  app clients don't need it.)
- **Env vars:**

    ```
    UPUP_TEST_GDRIVE_CLIENT_ID=
    UPUP_TEST_GDRIVE_CLIENT_SECRET=
    UPUP_TEST_GDRIVE_REFRESH_TOKEN=    # paste from the mint output
    ```

- **Mint:**

    ```bash
    pnpm run drive:sandbox:mint google-drive
    ```

    Click **Allow** (you'll see an "unverified app" interstitial — that's
    expected for an unverified sandbox app; continue), then paste the refresh
    token into `UPUP_TEST_GDRIVE_REFRESH_TOKEN`.

## Provider: OneDrive

- **Console:**
  [Microsoft Entra admin center](https://entra.microsoft.com) →
  **App registrations** (a free personal Microsoft account works).
- **App type:** a new **App registration**. For supported account types choose
  one that includes **"Personal Microsoft accounts"**. Add a **client secret**
  under **Certificates & secrets** (the flow is a confidential client).
- **Scopes / permissions:** delegated Microsoft Graph permissions
  **`Files.ReadWrite`** and **`offline_access`** (`offline_access` is what
  yields the refresh token; `Files.ReadWrite` covers seeding).
- **Redirect URI:** under **Authentication**, add a **Web** platform redirect
  `http://localhost:53682/callback`.
- **Tenant:** for a personal Microsoft account use tenant **`consumers`** (this
  is the default if you leave `UPUP_TEST_ONEDRIVE_TENANT` unset).
- **Env vars:**

    ```
    UPUP_TEST_ONEDRIVE_CLIENT_ID=
    UPUP_TEST_ONEDRIVE_CLIENT_SECRET=
    UPUP_TEST_ONEDRIVE_REFRESH_TOKEN=   # paste from the mint output
    UPUP_TEST_ONEDRIVE_TENANT=consumers
    ```

- **Mint:**

    ```bash
    pnpm run drive:sandbox:mint one-drive
    ```

    Click **Allow**, then paste the refresh token into
    `UPUP_TEST_ONEDRIVE_REFRESH_TOKEN`.

- **Heads-up (local runs):** OneDrive's refresh token rotates on every use, and
  local runs do **not** write the rotated value back to `local-dev/.env.test`.
  So after a local `seed`/`test` against OneDrive the stored token is stale —
  re-mint before your next local OneDrive run, or just let the nightly CI job
  (which does write the rotation back) own it.

## Wiring CI secrets

The `Drive-Sandbox` job in `.github/workflows/nightly.yml` reads these as GitHub
Actions repo secrets — **the same names** as the env vars above. They are
consumed by no other workflow; no PR check touches them. Set them with the
GitHub CLI (each `gh secret set` prompts for the value on stdin, so it never
lands in your shell history):

```bash
# Box
gh secret set UPUP_TEST_BOX_CLIENT_ID
gh secret set UPUP_TEST_BOX_CLIENT_SECRET
gh secret set UPUP_TEST_BOX_ENTERPRISE_ID
# Dropbox
gh secret set UPUP_TEST_DROPBOX_APP_KEY
gh secret set UPUP_TEST_DROPBOX_APP_SECRET
gh secret set UPUP_TEST_DROPBOX_REFRESH_TOKEN
# Google Drive
gh secret set UPUP_TEST_GDRIVE_CLIENT_ID
gh secret set UPUP_TEST_GDRIVE_CLIENT_SECRET
gh secret set UPUP_TEST_GDRIVE_REFRESH_TOKEN
# OneDrive
gh secret set UPUP_TEST_ONEDRIVE_CLIENT_ID
gh secret set UPUP_TEST_ONEDRIVE_CLIENT_SECRET
gh secret set UPUP_TEST_ONEDRIVE_REFRESH_TOKEN
gh secret set UPUP_TEST_ONEDRIVE_TENANT
```

The job's detector treats the presence of any one of
`UPUP_TEST_BOX_CLIENT_ID`, `UPUP_TEST_DROPBOX_REFRESH_TOKEN`,
`UPUP_TEST_GDRIVE_REFRESH_TOKEN`, or `UPUP_TEST_ONEDRIVE_REFRESH_TOKEN` as "there
is work to do." With none set, the whole job skips green with a notice.

### The OneDrive extra: a secrets-write PAT

Because OneDrive's refresh token rotates on every use, the nightly job has a
dedicated rotation step that runs once per night _before_ seed/test: it does the
refresh grant, writes the **new** refresh token back to the
`UPUP_TEST_ONEDRIVE_REFRESH_TOKEN` secret, and hands the freshly minted access
token forward to the seed/test steps (so the token is rotated exactly once per
night). The refresh token is deliberately never exposed to the seed/test steps.

Writing a secret back needs a token with secrets-write permission, stored as one
more secret:

```bash
gh secret set GH_SECRETS_WRITE_PAT
```

Create it as a **fine-grained personal access token** scoped to **this
repository only**, with the repository **"Secrets"** permission set to **Read
and write**.

If `GH_SECRETS_WRITE_PAT` is absent, the rotation step is a deliberate no-op: it
does **not** refresh (so it can't burn the stored refresh token with a rotation
it can't persist), and OneDrive is simply skipped for that run while the stored
token is left intact. The other three providers are unaffected.

### Triggering the job

`nightly.yml`'s `cron` only starts firing once the workflow file lives on the
repository's **default branch**. Until this branch is merged there, the schedule
will not run on its own — exercise the job (and keep the tokens warm) manually
from the Actions tab with **Run workflow** (`workflow_dispatch`).

## Maintenance & troubleshooting

**How a broken token shows up.** A provider counts as "configured" the moment
its secrets are present. A present-but-**broken** token (expired, revoked, wrong
scope, wrong Enterprise ID) does not skip — it throws and the suite goes
**RED**. That is intentional: a dead token is a real signal, not noise. So a red
`Drive-Sandbox` almost always means one specific provider needs re-minting, not
flaky infrastructure. The distinction is simply: **absent** secrets → skip
green; **present but broken** → red.

**Re-minting to update a secret.** Whenever you re-mint, push the new value to
CI too:

```bash
pnpm run drive:sandbox:mint <provider>
gh secret set UPUP_TEST_<PROVIDER>_REFRESH_TOKEN   # paste the new token
```

Per-provider expiry and recovery:

- **Box** — nothing expires on a schedule (it's a service account with no
  refresh token). If Box goes red, the **client secret** was rotated or revoked
  in the Box console, the CCG app was de-authorized in the admin console, or the
  Enterprise ID is wrong. Regenerate the secret and update
  `UPUP_TEST_BOX_CLIENT_SECRET`.
- **Dropbox** — the refresh token never expires. You only re-mint if the app is
  deleted or its secret is rotated: `pnpm run drive:sandbox:mint dropbox`.
- **Google Drive** — durable while the app stays **In production**; it dies
  after ~6 months of inactivity (the nightly run prevents that), or on a
  password change / manual revoke / scope change. If it dies,
  `pnpm run drive:sandbox:mint google-drive`. If tokens are expiring after only
  a week, the consent screen is still in **Testing** — move it to **In
  production**.
- **OneDrive** — rotating, 90-day sliding window. The nightly job rotates and
  writes it back, so it stays alive as long as the job runs at least every 90
  days and the PAT is valid. It goes stale if the job is paused for 90 days, if
  `GH_SECRETS_WRITE_PAT` is missing/expired, or if you ran the suite locally
  (local runs don't persist the rotation). Recover with
  `pnpm run drive:sandbox:mint one-drive` and update the secret. Remember the
  PAT itself expires (fine-grained PATs cap at one year) — rotate it and update
  `GH_SECRETS_WRITE_PAT` before it lapses.

**Box search indexing lag.** Box's search API is eventually consistent — a
file that was just seeded can take minutes to hours to appear in search results.
The suite therefore does not assert search **containment** for Box (a freshly
seeded fixture legitimately may not be indexed yet); Box coverage rests on the
list and byte-exact download paths, which are immediately consistent. This is
expected behavior, not a bug to "fix" by tightening the assertion.
