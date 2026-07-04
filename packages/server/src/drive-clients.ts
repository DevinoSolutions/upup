// packages/server/src/drive-clients.ts
//
// Per-provider cloud-drive API calls (list + fetch) behind a small internal
// surface, plus the shared driveFetch (401→reauth signal) and the query-value
// escaping helpers. Extracted verbatim from handler.ts (F-101/F-505). The two
// parallel dispatch switches (listDriveFiles/fetchDriveFile) are collapsed into
// a provider registry in C6 (F-407). Imports only the provider identity type
// from ./oauth (acyclic DAG).

import { type OAuthProvider } from './oauth'

export type DriveFile = {
    id: string
    name: string
    size?: number
    mimeType?: string
    thumbnailUrl?: string
    isFolder: boolean
    modifiedAt?: string
}

export async function listDriveFiles(
    provider: OAuthProvider,
    accessToken: string,
    opts: { folderId?: string; search?: string },
): Promise<DriveFile[]> {
    switch (provider) {
        case 'google-drive':
            return listGoogleDriveFiles(accessToken, opts)
        case 'onedrive':
            return listOneDriveFiles(accessToken, opts)
        case 'dropbox':
            return listDropboxFiles(accessToken, opts)
        case 'box':
            return listBoxFiles(accessToken, opts)
    }
}

export async function fetchDriveFile(
    provider: OAuthProvider,
    accessToken: string,
    body: {
        fileId: string
        fileName?: string
        size?: number
        mimeType?: string
    },
): Promise<{
    stream: ReadableStream<Uint8Array>
    size: number
    fileName: string
    mimeType: string
}> {
    switch (provider) {
        case 'google-drive':
            return fetchGoogleDriveFile(accessToken, body)
        case 'onedrive':
            return fetchOneDriveFile(accessToken, body)
        case 'dropbox':
            return fetchDropboxFile(accessToken, body)
        case 'box':
            return fetchBoxFile(accessToken, body)
    }
}

async function driveFetch(
    url: string,
    init: RequestInit = {},
): Promise<Response> {
    const res = await fetch(url, init)
    if (res.status === 401) {
        const err = new Error('Drive API 401') as Error & { status: number }
        err.status = 401
        throw err
    }
    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(
            `Drive API ${res.status}: ${text.slice(0, 200) || res.statusText}`,
        )
    }
    return res
}

/** Escape a value for use inside a Google Drive API query string literal (single-quoted).
 * Backslashes must be escaped before quotes to prevent query injection (audit S5). */
export function escapeDriveQueryValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

/**
 * Escape a user value for an OData string literal (Microsoft Graph). OData
 * escapes a single quote by doubling it. Applied before encodeURIComponent so
 * the doubled quote survives URL-decoding on Graph's side (defense-in-depth
 * parity with Google Drive's escapeDriveQueryValue).
 */
export function escapeODataSearchValue(value: string): string {
    return value.replace(/'/g, "''")
}

async function listGoogleDriveFiles(
    accessToken: string,
    opts: { folderId?: string; search?: string },
): Promise<DriveFile[]> {
    const parent = opts.folderId ?? 'root'
    const q = opts.search
        ? `name contains '${escapeDriveQueryValue(opts.search)}' and trashed = false`
        : `'${parent}' in parents and trashed = false`
    const params = new URLSearchParams({
        q,
        fields: 'files(id,name,size,mimeType,thumbnailLink,modifiedTime,iconLink)',
        pageSize: '200',
    })
    const res = await driveFetch(
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    const data = (await res.json()) as {
        files: Array<{
            id: string
            name: string
            size?: string
            mimeType: string
            thumbnailLink?: string
            modifiedTime?: string
        }>
    }
    return data.files.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size ? Number(f.size) : undefined,
        mimeType: f.mimeType,
        thumbnailUrl: f.thumbnailLink,
        isFolder: f.mimeType === 'application/vnd.google-apps.folder',
        modifiedAt: f.modifiedTime,
    }))
}

async function fetchGoogleDriveFile(
    accessToken: string,
    body: {
        fileId: string
        fileName?: string
        size?: number
        mimeType?: string
    },
) {
    const metaRes = await driveFetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
            body.fileId,
        )}?fields=name,size,mimeType`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    const meta = (await metaRes.json()) as {
        name: string
        size?: string
        mimeType?: string
    }
    const dlRes = await driveFetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
            body.fileId,
        )}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!dlRes.body) throw new Error('Empty download body')
    return {
        stream: dlRes.body,
        size: Number(meta.size ?? body.size ?? 0),
        fileName: body.fileName ?? meta.name,
        mimeType: body.mimeType ?? meta.mimeType ?? 'application/octet-stream',
    }
}

async function listOneDriveFiles(
    accessToken: string,
    opts: { folderId?: string; search?: string },
): Promise<DriveFile[]> {
    const path = opts.search
        ? `/me/drive/root/search(q='${encodeURIComponent(escapeODataSearchValue(opts.search))}')`
        : opts.folderId
          ? `/me/drive/items/${encodeURIComponent(opts.folderId)}/children`
          : '/me/drive/root/children'
    const res = await driveFetch(`https://graph.microsoft.com/v1.0${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = (await res.json()) as {
        value: Array<{
            id: string
            name: string
            size?: number
            file?: { mimeType?: string }
            folder?: unknown
            lastModifiedDateTime?: string
        }>
    }
    return data.value.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        mimeType: f.file?.mimeType,
        isFolder: !!f.folder,
        modifiedAt: f.lastModifiedDateTime,
    }))
}

async function fetchOneDriveFile(
    accessToken: string,
    body: {
        fileId: string
        fileName?: string
        size?: number
        mimeType?: string
    },
) {
    const metaRes = await driveFetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(
            body.fileId,
        )}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    const meta = (await metaRes.json()) as {
        name: string
        size?: number
        file?: { mimeType?: string }
    }
    const dlRes = await driveFetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(
            body.fileId,
        )}/content`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!dlRes.body) throw new Error('Empty download body')
    return {
        stream: dlRes.body,
        size: meta.size ?? body.size ?? 0,
        fileName: body.fileName ?? meta.name,
        mimeType:
            body.mimeType ?? meta.file?.mimeType ?? 'application/octet-stream',
    }
}

async function listDropboxFiles(
    accessToken: string,
    opts: { folderId?: string; search?: string },
): Promise<DriveFile[]> {
    const endpoint = opts.search
        ? 'https://api.dropboxapi.com/2/files/search_v2'
        : 'https://api.dropboxapi.com/2/files/list_folder'
    const body = opts.search
        ? { query: opts.search }
        : { path: opts.folderId ?? '', recursive: false }
    const res = await driveFetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })
    const data = (await res.json()) as
        | {
              entries: Array<{
                  '.tag': 'file' | 'folder' | 'deleted'
                  id: string
                  name: string
                  path_lower?: string
                  size?: number
                  server_modified?: string
              }>
          }
        | {
              matches: Array<{
                  metadata: {
                      metadata: {
                          '.tag': 'file' | 'folder'
                          id: string
                          name: string
                          path_lower?: string
                          size?: number
                      }
                  }
              }>
          }
    const entries =
        'entries' in data
            ? data.entries
            : data.matches.map(m => m.metadata.metadata)
    return entries
        .filter(e => e['.tag'] !== 'deleted')
        .map(e => ({
            id: e.path_lower ?? e.id,
            name: e.name,
            size: 'size' in e ? e.size : undefined,
            isFolder: e['.tag'] === 'folder',
            modifiedAt: 'server_modified' in e ? e.server_modified : undefined,
        }))
}

async function fetchDropboxFile(
    accessToken: string,
    body: {
        fileId: string
        fileName?: string
        size?: number
        mimeType?: string
    },
) {
    const dlRes = await driveFetch(
        'https://content.dropboxapi.com/2/files/download',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Dropbox-API-Arg': JSON.stringify({ path: body.fileId }),
            },
        },
    )
    if (!dlRes.body) throw new Error('Empty download body')
    const apiResult = dlRes.headers.get('Dropbox-API-Result')
    let name = body.fileName ?? 'download'
    let size = body.size ?? 0
    if (apiResult) {
        try {
            const parsed = JSON.parse(apiResult) as {
                name?: string
                size?: number
            }
            name = body.fileName ?? parsed.name ?? name
            size = parsed.size ?? size
        } catch {}
    }
    return {
        stream: dlRes.body,
        size,
        fileName: name,
        mimeType:
            body.mimeType ??
            dlRes.headers.get('Content-Type') ??
            'application/octet-stream',
    }
}

async function listBoxFiles(
    accessToken: string,
    opts: { folderId?: string; search?: string },
): Promise<DriveFile[]> {
    if (opts.search) {
        const params = new URLSearchParams({
            query: opts.search,
            limit: '200',
        })
        const res = await driveFetch(
            `https://api.box.com/2.0/search?${params.toString()}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        const data = (await res.json()) as {
            entries: Array<{
                type: 'file' | 'folder'
                id: string
                name: string
                size?: number
                modified_at?: string
            }>
        }
        return data.entries.map(e => ({
            id: e.id,
            name: e.name,
            size: e.size,
            isFolder: e.type === 'folder',
            modifiedAt: e.modified_at,
        }))
    }
    const folderId = opts.folderId ?? '0'
    const res = await driveFetch(
        `https://api.box.com/2.0/folders/${encodeURIComponent(folderId)}/items?limit=200&fields=id,name,size,type,modified_at`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    const data = (await res.json()) as {
        entries: Array<{
            type: 'file' | 'folder'
            id: string
            name: string
            size?: number
            modified_at?: string
        }>
    }
    return data.entries.map(e => ({
        id: e.id,
        name: e.name,
        size: e.size,
        isFolder: e.type === 'folder',
        modifiedAt: e.modified_at,
    }))
}

async function fetchBoxFile(
    accessToken: string,
    body: {
        fileId: string
        fileName?: string
        size?: number
        mimeType?: string
    },
) {
    const metaRes = await driveFetch(
        `https://api.box.com/2.0/files/${encodeURIComponent(body.fileId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    const meta = (await metaRes.json()) as { name: string; size?: number }
    const dlRes = await driveFetch(
        `https://api.box.com/2.0/files/${encodeURIComponent(body.fileId)}/content`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
            redirect: 'follow',
        },
    )
    if (!dlRes.body) throw new Error('Empty download body')
    return {
        stream: dlRes.body,
        size: meta.size ?? body.size ?? 0,
        fileName: body.fileName ?? meta.name,
        mimeType:
            body.mimeType ??
            dlRes.headers.get('Content-Type') ??
            'application/octet-stream',
    }
}
