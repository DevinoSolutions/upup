// scripts/drive-sandbox/fixtures.mjs
//
// The committed fixture set that seed.mjs uploads into each sandbox account and
// the live integration suite reads back. The BYTES live on disk under
// ./fixtures/ (one source of truth): seed.mjs imports this module; the vitest
// suite reads the SAME files via fs (it cannot import a .mjs under the server's
// test-tree typecheck). Per-account file IDs are never committed — the suite
// discovers them at runtime by listing the folder and matching on name, then
// hash-checks the downloaded bytes against sha256 of the on-disk fixture.
//
// The fixtures dir is marked binary in .gitattributes so no platform EOL
// normalization can perturb the bytes (a byte-exact sha256 is the whole point).
// upup-sandbox-hello.txt carries a multibyte UTF-8 char; upup-sandbox-bytes.bin
// is a 256-byte 0x00–0xFF blob — together they prove the list→download pipe is
// byte-exact for both UTF-8 text and non-textual binary, not just ASCII.

import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

/** All fixtures live under one discoverable folder in each account's root. */
export const SANDBOX_FOLDER = 'upup-sandbox-fixtures'

/** The fixture files, bytes loaded eagerly from disk. */
export const SANDBOX_FIXTURES = [
    { name: 'upup-sandbox-hello.txt', mimeType: 'text/plain' },
    { name: 'upup-sandbox-bytes.bin', mimeType: 'application/octet-stream' },
].map(f => ({
    ...f,
    bytes: new Uint8Array(readFileSync(join(fixturesDir, f.name))),
}))

/** Lowercase hex sha256 of a byte buffer. Shared by seeder + suite so the
 *  "expected" hash can never drift from the committed content. */
export function sha256(bytes) {
    return createHash('sha256').update(bytes).digest('hex')
}

// ── Large fixture (generated, NOT stored on disk — 6 MiB in git is bloat) ────
//
// Deterministic bytes from a sha256 counter chain: block i =
// sha256(`${seed}:${i}`), concatenated then truncated. Incompressible, stable
// across runs/platforms/languages. The size exceeds MIN_PART_SIZE (5 MiB —
// packages/server/src/providers/aws.ts:30), so a server-mode transfer of this
// file is FORCED down transfer.ts's streamingMultipart path; the +45 tail makes
// the final part a short one. The sha256 pin is the cross-implementation drift
// guard: the TS twin in apps/e2e-test/drive-sandbox/server-transfer.spec.ts
// must hash to the same value or it refuses to run before any network call.
// The content hash is baked into the NAME, so an already-present file with this
// name is guaranteed current (skip-safe) and a generator change reseeds fresh.
export const LARGE_FIXTURE_SEED = 'upup-sandbox-large-v1'
export const LARGE_FIXTURE_SIZE = 6 * 1024 * 1024 + 45
export const LARGE_FIXTURE_SHA256 =
    'a97b029edbb8bdd512a6980623272921ed4a53ea0d3b61f8cf01cbaa9b94ef3b'
export const LARGE_FIXTURE_NAME = `upup-sandbox-large-${LARGE_FIXTURE_SHA256.slice(0, 8)}.bin`
export const LARGE_FIXTURE_MIME = 'application/octet-stream'

export function generateLargeFixtureBytes() {
    const out = new Uint8Array(LARGE_FIXTURE_SIZE)
    let offset = 0
    for (let block = 0; offset < LARGE_FIXTURE_SIZE; block++) {
        const digest = createHash('sha256')
            .update(`${LARGE_FIXTURE_SEED}:${block}`)
            .digest()
        const take = Math.min(digest.length, LARGE_FIXTURE_SIZE - offset)
        out.set(digest.subarray(0, take), offset)
        offset += take
    }
    if (sha256(out) !== LARGE_FIXTURE_SHA256) {
        throw new Error(
            '[drive-sandbox] large-fixture generator drifted from its sha256 pin',
        )
    }
    return out
}
