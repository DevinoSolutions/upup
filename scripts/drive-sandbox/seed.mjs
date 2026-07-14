// scripts/drive-sandbox/seed.mjs
//
// Seeds the cloud-drive SANDBOX accounts with the committed fixture tree so the
// live integration suite has a known folder to list and hash-check against.
//
//   node scripts/drive-sandbox/seed.mjs <provider|all>
//
// For each target provider it IDEMPOTENTLY ensures that a folder named
// SANDBOX_FOLDER exists in the account root and contains every SANDBOX_FIXTURE
// with its exact bytes. Re-running is safe: folders are found-or-created (never
// duplicated) and files are skipped when already present — except dropbox and
// one-drive, whose native uploads are creates-or-replaces (byte-identical, so
// still idempotent). Each file is reported as `created` or `exists (skipped)`.
//
// A provider whose sandbox secrets are absent is SKIPPED (a clean, non-error
// notice) so a partially-provisioned CI still seeds what it can. A real API
// failure for a CONFIGURED provider throws and exits 1 — a broken sandbox is a
// real signal, not something to swallow.

import {
    PROVIDERS,
    isProviderConfigured,
    mintAccessToken,
} from './providers.mjs'
import {
    SANDBOX_FIXTURES,
    SANDBOX_FOLDER,
    LARGE_FIXTURE_NAME,
    LARGE_FIXTURE_SIZE,
    LARGE_FIXTURE_MIME,
    generateLargeFixtureBytes,
} from './fixtures.mjs'

/** fetch that throws on any non-2xx, with the response body (truncated) in the
 *  message so a broken sandbox reports WHY. Returns the ok Response — the caller
 *  reads .json() (or ignores the body for uploads). */
async function api(url, options, label) {
    const res = await fetch(url, options)
    if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(
            `[drive-sandbox] ${label} → ${res.status}: ${
                body.slice(0, 300) || res.statusText
            }`,
        )
    }
    return res
}

/** Dropbox-API-Arg is an HTTP HEADER: escape every char ≥ 0x7F as \uXXXX
 *  (headers are latin-1; undici rejects non-ASCII header values outright).
 *  Mirrors httpHeaderSafeJson in packages/server/src/drive-clients.ts. */
function headerSafeJson(value) {
    return JSON.stringify(value).replace(
        /[\u007f-\uffff]/g,
        c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'),
    )
}

/** Escape a value for a Drive query single-quoted literal (backslashes first).
 *  Mirrors escapeDriveQueryValue in packages/server/src/drive-clients.ts. */
function escapeGDriveQueryValue(value) {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

// ── box (service account; root folder id is '0', CCG token) ──────────────────

/** Create the sandbox folder in Box root, tolerating a 409 name-conflict from a
 *  concurrent seed by re-listing root to recover the winner's id. */
async function createBoxFolder(headers) {
    const res = await fetch('https://api.box.com/2.0/folders', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: SANDBOX_FOLDER, parent: { id: '0' } }),
    })
    if (res.ok) return (await res.json()).id
    if (res.status === 409) {
        const relist = await api(
            'https://api.box.com/2.0/folders/0/items?limit=1000&fields=id,name,type',
            { headers },
            'box re-list root',
        )
        const items = await relist.json()
        const found = items.entries.find(
            e => e.type === 'folder' && e.name === SANDBOX_FOLDER,
        )
        if (found) return found.id
    }
    const body = await res.text().catch(() => '')
    throw new Error(
        `[drive-sandbox] box create folder → ${res.status}: ${
            body.slice(0, 300) || res.statusText
        }`,
    )
}

async function seedBox(token) {
    const headers = { Authorization: `Bearer ${token}` }
    const rootRes = await api(
        'https://api.box.com/2.0/folders/0/items?limit=1000&fields=id,name,type',
        { headers },
        'box list root',
    )
    const root = await rootRes.json()
    let folderId = root.entries.find(
        e => e.type === 'folder' && e.name === SANDBOX_FOLDER,
    )?.id
    if (!folderId) folderId = await createBoxFolder(headers)

    const itemsRes = await api(
        `https://api.box.com/2.0/folders/${folderId}/items?limit=1000&fields=id,name`,
        { headers },
        'box list folder',
    )
    const items = await itemsRes.json()
    const existing = new Set(items.entries.map(e => e.name))

    const results = []
    for (const fixture of SANDBOX_FIXTURES) {
        if (existing.has(fixture.name)) {
            results.push({ name: fixture.name, status: 'exists (skipped)' })
            continue
        }
        const fd = new FormData()
        fd.append(
            'attributes',
            JSON.stringify({ name: fixture.name, parent: { id: folderId } }),
        )
        fd.append('file', new Blob([fixture.bytes]), fixture.name)
        await api(
            'https://upload.box.com/api/2.0/files/content',
            { method: 'POST', headers, body: fd },
            `box upload ${fixture.name}`,
        )
        results.push({ name: fixture.name, status: 'created' })
    }

    // Large fixture: the content hash is in the name → present ⇒ current.
    if (existing.has(LARGE_FIXTURE_NAME)) {
        results.push({ name: LARGE_FIXTURE_NAME, status: 'exists (skipped)' })
    } else {
        const bytes = generateLargeFixtureBytes()
        const fd = new FormData()
        fd.append(
            'attributes',
            JSON.stringify({
                name: LARGE_FIXTURE_NAME,
                parent: { id: folderId },
            }),
        )
        fd.append('file', new Blob([bytes]), LARGE_FIXTURE_NAME)
        await api(
            'https://upload.box.com/api/2.0/files/content',
            { method: 'POST', headers, body: fd },
            `box upload ${LARGE_FIXTURE_NAME}`,
        )
        results.push({ name: LARGE_FIXTURE_NAME, status: 'created' })
    }
    return results
}

// ── dropbox (paths; overwrite upload = idempotent) ───────────────────────────

async function seedDropbox(token) {
    const headers = { Authorization: `Bearer ${token}` }
    const mkRes = await fetch(
        'https://api.dropboxapi.com/2/files/create_folder_v2',
        {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: `/${SANDBOX_FOLDER}`,
                autorename: false,
            }),
        },
    )
    if (!mkRes.ok) {
        const body = await mkRes.text().catch(() => '')
        // A 409 path/conflict just means the folder already exists → success.
        const alreadyExists =
            mkRes.status === 409 && body.includes('path/conflict')
        if (!alreadyExists) {
            throw new Error(
                `[drive-sandbox] dropbox create folder → ${mkRes.status}: ${
                    body.slice(0, 300) || mkRes.statusText
                }`,
            )
        }
    }

    const results = []
    for (const fixture of SANDBOX_FIXTURES) {
        const apiArg = headerSafeJson({
            path: `/${SANDBOX_FOLDER}/${fixture.name}`,
            mode: 'overwrite',
            mute: true,
            autorename: false,
        })
        await api(
            'https://content.dropboxapi.com/2/files/upload',
            {
                method: 'POST',
                headers: {
                    ...headers,
                    'Dropbox-API-Arg': apiArg,
                    'Content-Type': 'application/octet-stream',
                },
                body: Buffer.from(fixture.bytes),
            },
            `dropbox upload ${fixture.name}`,
        )
        // overwrite is a create-or-replace — always report as created.
        results.push({ name: fixture.name, status: 'created' })
    }

    const largeProbe = await fetch(
        'https://api.dropboxapi.com/2/files/get_metadata',
        {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: `/${SANDBOX_FOLDER}/${LARGE_FIXTURE_NAME}`,
            }),
        },
    )
    if (
        largeProbe.ok &&
        (await largeProbe.json()).size === LARGE_FIXTURE_SIZE
    ) {
        results.push({ name: LARGE_FIXTURE_NAME, status: 'exists (skipped)' })
    } else {
        await api(
            'https://content.dropboxapi.com/2/files/upload',
            {
                method: 'POST',
                headers: {
                    ...headers,
                    'Dropbox-API-Arg': headerSafeJson({
                        path: `/${SANDBOX_FOLDER}/${LARGE_FIXTURE_NAME}`,
                        mode: 'overwrite',
                        mute: true,
                        autorename: false,
                    }),
                    'Content-Type': 'application/octet-stream',
                },
                body: Buffer.from(generateLargeFixtureBytes()),
            },
            `dropbox upload ${LARGE_FIXTURE_NAME}`,
        )
        results.push({ name: LARGE_FIXTURE_NAME, status: 'created' })
    }
    return results
}

// ── google-drive (drive.file scope; multipart/related upload) ────────────────

const GDRIVE_BOUNDARY = 'upup-sandbox-boundary-7c1f9a2e8d3b'

/** uploadType=multipart caps at 5 MB — larger fixtures go through a resumable
 *  session: init (metadata → session URL) then one PUT of all bytes. */
async function uploadGoogleDriveResumable(
    headers,
    folderId,
    name,
    bytes,
    mimeType,
) {
    const initRes = await api(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
        {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Upload-Content-Type': mimeType,
                'X-Upload-Content-Length': String(bytes.length),
            },
            body: JSON.stringify({ name, parents: [folderId] }),
        },
        `google-drive resumable init ${name}`,
    )
    const session = initRes.headers.get('Location')
    if (!session) {
        throw new Error(
            `[drive-sandbox] google-drive resumable init for ${name} returned no session Location`,
        )
    }
    await api(
        session,
        {
            method: 'PUT',
            headers: { 'Content-Type': mimeType },
            body: Buffer.from(bytes),
        },
        `google-drive resumable put ${name}`,
    )
}

async function seedGoogleDrive(token) {
    const headers = { Authorization: `Bearer ${token}` }
    const folderQuery = encodeURIComponent(
        `name='${escapeGDriveQueryValue(
            SANDBOX_FOLDER,
        )}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    )
    const findRes = await api(
        `https://www.googleapis.com/drive/v3/files?q=${folderQuery}&fields=files(id,name)`,
        { headers },
        'google-drive find folder',
    )
    const findJson = await findRes.json()
    let folderId = findJson.files[0]?.id
    if (!folderId) {
        const createRes = await api(
            'https://www.googleapis.com/drive/v3/files',
            {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: SANDBOX_FOLDER,
                    mimeType: 'application/vnd.google-apps.folder',
                }),
            },
            'google-drive create folder',
        )
        folderId = (await createRes.json()).id
    }

    const results = []
    for (const fixture of SANDBOX_FIXTURES) {
        const fileQuery = encodeURIComponent(
            `name='${escapeGDriveQueryValue(
                fixture.name,
            )}' and '${folderId}' in parents and trashed=false`,
        )
        const existsRes = await api(
            `https://www.googleapis.com/drive/v3/files?q=${fileQuery}&fields=files(id,name)`,
            { headers },
            `google-drive find ${fixture.name}`,
        )
        const existsJson = await existsRes.json()
        if (existsJson.files.length > 0) {
            results.push({ name: fixture.name, status: 'exists (skipped)' })
            continue
        }
        const metadata = JSON.stringify({
            name: fixture.name,
            parents: [folderId],
        })
        const head =
            `--${GDRIVE_BOUNDARY}\r\n` +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            metadata +
            `\r\n--${GDRIVE_BOUNDARY}\r\n` +
            `Content-Type: ${fixture.mimeType}\r\n\r\n`
        const tail = `\r\n--${GDRIVE_BOUNDARY}--`
        const body = Buffer.concat([
            Buffer.from(head, 'utf8'),
            Buffer.from(fixture.bytes),
            Buffer.from(tail, 'utf8'),
        ])
        await api(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': `multipart/related; boundary=${GDRIVE_BOUNDARY}`,
                },
                body,
            },
            `google-drive upload ${fixture.name}`,
        )
        results.push({ name: fixture.name, status: 'created' })
    }

    const largeQuery = encodeURIComponent(
        `name='${escapeGDriveQueryValue(
            LARGE_FIXTURE_NAME,
        )}' and '${folderId}' in parents and trashed=false`,
    )
    const largeExists = await api(
        `https://www.googleapis.com/drive/v3/files?q=${largeQuery}&fields=files(id)`,
        { headers },
        `google-drive find ${LARGE_FIXTURE_NAME}`,
    )
    if ((await largeExists.json()).files.length > 0) {
        results.push({ name: LARGE_FIXTURE_NAME, status: 'exists (skipped)' })
    } else {
        await uploadGoogleDriveResumable(
            headers,
            folderId,
            LARGE_FIXTURE_NAME,
            generateLargeFixtureBytes(),
            LARGE_FIXTURE_MIME,
        )
        results.push({ name: LARGE_FIXTURE_NAME, status: 'created' })
    }

    // A NATIVE Google Doc (no binary content): alt=media cannot download these.
    // The fixture exists to PIN how the surface fails for a real user today —
    // export support is a future maintainer decision, not silently added.
    const GDOC_NAME = 'upup-sandbox-native-doc'
    const gdocQuery = encodeURIComponent(
        `name='${escapeGDriveQueryValue(GDOC_NAME)}' and '${folderId}' in parents and trashed=false`,
    )
    const gdocExists = await api(
        `https://www.googleapis.com/drive/v3/files?q=${gdocQuery}&fields=files(id)`,
        { headers },
        'google-drive find native doc',
    )
    if ((await gdocExists.json()).files.length > 0) {
        results.push({ name: GDOC_NAME, status: 'exists (skipped)' })
    } else {
        await api(
            'https://www.googleapis.com/drive/v3/files',
            {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: GDOC_NAME,
                    parents: [folderId],
                    mimeType: 'application/vnd.google-apps.document',
                }),
            },
            'google-drive create native doc',
        )
        results.push({ name: GDOC_NAME, status: 'created' })
    }
    return results
}

// ── one-drive (/me/drive; simple PUT = create-or-replace) ────────────────────

/** Simple PUT :/content is for small files only — large fixtures go through a
 *  Graph upload session. One chunk = the FINAL chunk, so the 320 KiB multiple
 *  rule doesn't apply; the session URL is pre-authorized (no auth header). */
async function uploadOneDriveSession(name, bytes, headers) {
    const encodedName = encodeURIComponent(name)
    const sessionRes = await api(
        `https://graph.microsoft.com/v1.0/me/drive/root:/${SANDBOX_FOLDER}/${encodedName}:/createUploadSession`,
        {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item: { '@microsoft.graph.conflictBehavior': 'replace', name },
            }),
        },
        `one-drive create upload session ${name}`,
    )
    const { uploadUrl } = await sessionRes.json()
    if (!uploadUrl) {
        throw new Error(
            `[drive-sandbox] one-drive createUploadSession for ${name} returned no uploadUrl`,
        )
    }
    await api(
        uploadUrl,
        {
            method: 'PUT',
            headers: {
                'Content-Range': `bytes 0-${bytes.length - 1}/${bytes.length}`,
            },
            body: Buffer.from(bytes),
        },
        `one-drive upload session put ${name}`,
    )
}

async function seedOneDrive(token) {
    const headers = { Authorization: `Bearer ${token}` }
    const probe = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:/${SANDBOX_FOLDER}`,
        { headers },
    )
    if (!probe.ok && probe.status !== 404) {
        const body = await probe.text().catch(() => '')
        throw new Error(
            `[drive-sandbox] one-drive probe folder → ${probe.status}: ${
                body.slice(0, 300) || probe.statusText
            }`,
        )
    }
    if (probe.status === 404) {
        await api(
            'https://graph.microsoft.com/v1.0/me/drive/root/children',
            {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: SANDBOX_FOLDER,
                    folder: {},
                    '@microsoft.graph.conflictBehavior': 'replace',
                }),
            },
            'one-drive create folder',
        )
    }

    const results = []
    for (const fixture of SANDBOX_FIXTURES) {
        const encodedName = encodeURIComponent(fixture.name)
        await api(
            `https://graph.microsoft.com/v1.0/me/drive/root:/${SANDBOX_FOLDER}/${encodedName}:/content`,
            {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': fixture.mimeType },
                body: Buffer.from(fixture.bytes),
            },
            `one-drive upload ${fixture.name}`,
        )
        // Simple upload is a create-or-replace — always report as created.
        results.push({ name: fixture.name, status: 'created' })
    }

    const largeProbe = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:/${SANDBOX_FOLDER}/${encodeURIComponent(
            LARGE_FIXTURE_NAME,
        )}`,
        { headers },
    )
    if (
        largeProbe.ok &&
        (await largeProbe.json()).size === LARGE_FIXTURE_SIZE
    ) {
        results.push({ name: LARGE_FIXTURE_NAME, status: 'exists (skipped)' })
    } else {
        await uploadOneDriveSession(
            LARGE_FIXTURE_NAME,
            generateLargeFixtureBytes(),
            headers,
        )
        results.push({ name: LARGE_FIXTURE_NAME, status: 'created' })
    }
    return results
}

// ── dispatch + CLI ───────────────────────────────────────────────────────────

const SEEDERS = {
    box: seedBox,
    dropbox: seedDropbox,
    'google-drive': seedGoogleDrive,
    'one-drive': seedOneDrive,
}

function usage() {
    console.error('Usage: node scripts/drive-sandbox/seed.mjs <provider|all>')
    console.error(`  provider: one of ${PROVIDERS.join(', ')} — or "all"`)
}

async function main() {
    const arg = process.argv[2]
    let targets
    if (arg === 'all') {
        targets = PROVIDERS
    } else if (PROVIDERS.includes(arg)) {
        targets = [arg]
    } else {
        if (arg) console.error(`[drive-sandbox] unknown provider: ${arg}`)
        usage()
        process.exit(1)
    }

    const seeded = []
    const skipped = []
    for (const provider of targets) {
        if (!isProviderConfigured(provider)) {
            console.log(`[drive-sandbox] skipping ${provider} (not configured)`)
            skipped.push(provider)
            continue
        }
        console.log(`[drive-sandbox] seeding ${provider}...`)
        const token = await mintAccessToken(provider)
        const results = await SEEDERS[provider](token)
        for (const r of results) {
            console.log(`  ${provider}: ${r.name} — ${r.status}`)
        }
        seeded.push(provider)
    }

    const seededList = seeded.join(', ') || '(none)'
    const skippedList = skipped.join(', ') || '(none)'
    console.log('')
    console.log(`[drive-sandbox] done — seeded: ${seededList}`)
    console.log(`[drive-sandbox] skipped (not configured): ${skippedList}`)
}

main().catch(err => {
    console.error(`[drive-sandbox] seed failed: ${err.message}`)
    process.exit(1)
})
