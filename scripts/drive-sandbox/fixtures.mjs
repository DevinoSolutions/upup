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
