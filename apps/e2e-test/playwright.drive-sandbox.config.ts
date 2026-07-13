import { defineConfig } from '@playwright/test'

// Dedicated config for the live four-provider -> @upupjs/server -> MinIO proof
// (box, dropbox, google-drive, one-drive).
// Deliberately isolated from the default suites: its own testDir keeps it OUT
// of `test:e2e` (testDir ./e2e) and `test:e2e:cf`, so `pnpm run e2e` never runs
// it. There is NO webServer here — the spec boots one real in-process
// @upupjs/server on an ephemeral port itself (no six-storybook boot). It is
// env-gated (UPUP_DRIVE_SANDBOX + creds + MinIO) and adopted by the nightly.
//
//   dotenv -e local-dev/.env.minio -e local-dev/.env.test -- \
//     pnpm --filter @upupjs/e2e-test test:e2e:drive-sandbox
export default defineConfig({
    testDir: './drive-sandbox',
    // Real OAuth token mints + drive API calls + a drive->S3 transfer per test.
    timeout: 90_000,
    expect: { timeout: 20_000 },
    // A single shared in-process server + tokenStore; one worker avoids
    // port/token races and keeps the real API-call volume modest.
    workers: 1,
    fullyParallel: false,
    reporter: [['list']],
})
