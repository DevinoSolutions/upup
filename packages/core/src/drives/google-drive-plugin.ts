import type { EventEmitter } from '../events'
import type { DrivePlugin } from './plugin'
import type { GoogleDriveConfig } from './configs'
import type { DriveFile, DriveState } from './types'
import { storageGet, storageSet, storageDel } from './session-storage'
import { escapeDriveQueryValue } from './query-escape'
import { UpupAuthError, UpupNetworkError } from '../errors'

// ── Session storage keys ──
const SK_ACCESS = 'upup_gdrive_access_token'
const SK_EXPIRY = 'upup_gdrive_token_expiry'

// ── Google API endpoints ──
const FILES_URL = 'https://www.googleapis.com/drive/v3/files'
const DRIVES_URL = 'https://www.googleapis.com/drive/v3/drives'
const USER_INFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

const FOLDER_MIME = 'application/vnd.google-apps.folder'

/**
 * The synthetic folder id standing for Drive's "Shared with me" view (#391).
 * It is not a real Drive file id — "shared with me" is a QUERY
 * (`sharedWithMe = true`), not a parent, so `'<id>' in parents` cannot express
 * it. `loadFiles`/`loadMoreFiles` branch on this one value; everything else in
 * the picker (navigation, breadcrumbs, pagination) treats it as an ordinary
 * folder id and needs no knowledge of it.
 */
export const SHARED_WITH_ME_FOLDER_ID = '__upup_shared_with_me__'

/**
 * Shown as the label of that virtual folder. English, like the per-provider root
 * names in `drive-browser-descriptors.ts` — plugins have no translator, and a
 * localised label needs a marker on `DriveFile` that no other entry carries.
 */
const SHARED_WITH_ME_FOLDER_NAME = 'Shared with me'

// ── Google Drive API response shapes (only the fields this file reads) ──

interface GoogleUserInfoResponse {
    name?: string
    email?: string
    picture?: string
}

interface GoogleFilesListResponse {
    files?: Record<string, unknown>[]
    nextPageToken?: string
}

interface GoogleDrivesListResponse {
    drives?: { id?: string; name?: string }[]
    nextPageToken?: string
}

// ── Google Workspace export mapping ──

const WORKSPACE_EXPORT_MAP: Record<
    string,
    { exportMime: string; ext: string; docType: string }
> = {
    'application/vnd.google-apps.document': {
        exportMime:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ext: 'docx',
        docType: 'document',
    },
    'application/vnd.google-apps.spreadsheet': {
        exportMime:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ext: 'xlsx',
        docType: 'spreadsheets',
    },
    'application/vnd.google-apps.presentation': {
        exportMime:
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ext: 'pptx',
        docType: 'presentation',
    },
    'application/vnd.google-apps.drawing': {
        exportMime: 'image/png',
        ext: 'png',
        docType: 'drawings',
    },
}

// ── Format mapping for export URLs ──
const FORMAT_MAP: Record<string, string> = {
    docx: 'docx',
    xlsx: 'xlsx',
    pptx: 'pptx',
    png: 'png',
}

// ── Helpers ──

function isWorkspaceFile(mimeType: string): boolean {
    return mimeType in WORKSPACE_EXPORT_MAP
}

function getExportUrl(fileId: string, mimeType: string): string | null {
    const mapping = WORKSPACE_EXPORT_MAP[mimeType]
    if (!mapping) return null
    const format = FORMAT_MAP[mapping.ext]
    return `https://docs.google.com/${mapping.docType}/d/${fileId}/export?format=${format}`
}

function mapGoogleEntry(entry: Record<string, unknown>): DriveFile {
    const mimeType = (entry.mimeType as string | undefined) ?? ''
    const isFolder = mimeType === 'application/vnd.google-apps.folder'

    return {
        id: (entry.id as string | undefined) ?? '',
        name: (entry.name as string | undefined) ?? '',
        path: '', // Google Drive doesn't return a path, uses parent IDs
        size: isFolder
            ? 0
            : typeof entry.size === 'number'
              ? entry.size
              : typeof entry.size === 'string'
                ? parseInt(entry.size, 10) || 0
                : 0,
        mimeType: isFolder ? 'folder' : mimeType,
        isFolder,
        thumbnail: (entry.thumbnailLink as string | undefined) ?? undefined,
        modifiedAt: undefined,
    }
}

// ── GoogleDrivePlugin ──

export class GoogleDrivePlugin implements DrivePlugin {
    readonly id = 'google-drive'
    readonly name = 'google-drive'

    private emitter: EventEmitter | null = null
    private config: GoogleDriveConfig = {
        apiKey: '',
        appId: '',
        clientId: '',
    }
    private accessToken: string | null = null
    private tokenExpiry = 0
    private state: DriveState = 'idle'

    /**
     * The shared-drive query params, or nothing when `sharedDrives` is off (#391).
     * Drive v3 answers a `files.list` from the caller's own corpus unless all
     * three are present, so a file living in a shared drive is invisible at every
     * depth — including to the picker's search box, which filters the children
     * already loaded. Spread into the params of every listing call.
     */
    private sharedDriveParams(): Record<string, string> {
        return this.config.sharedDrives
            ? {
                  corpora: 'allDrives',
                  includeItemsFromAllDrives: 'true',
                  supportsAllDrives: 'true',
              }
            : {}
    }

    /**
     * The `files.list` query for one picker folder. Every id is a parent except
     * the synthetic "Shared with me" one, which is a query instead — Drive has no
     * folder whose children are the files other people shared with you.
     *
     * The id is escaped, not interpolated raw: a folder id reaches here from a
     * Drive API response or a host-supplied argument, and an unescaped `'` ends
     * the literal and lets the rest of the value become query syntax. Same
     * escaper the server-mode drive client uses — one implementation in
     * `query-escape.ts`, so the two halves cannot drift.
     */
    private listQuery(parentId: string): string {
        return parentId === SHARED_WITH_ME_FOLDER_ID
            ? 'sharedWithMe = true and trashed = false'
            : `'${escapeDriveQueryValue(parentId)}' in parents and trashed = false`
    }

    /**
     * The user's shared drives as navigable folder entries (#391).
     *
     * `corpora=allDrives` widens which files a query CAN return, but every
     * listing is still `'<parentId>' in parents`, and `'root'` resolves to My
     * Drive root — so without this a shared drive has no entry to click and its
     * contents stay unreachable at every depth. A shared drive's root folder id
     * IS its drive id, so once one is listed the ordinary parent listing walks it
     * with no further special-casing.
     *
     * Requires no extra OAuth scope: `drive.readonly` covers `drives.list`.
     *
     * NEVER throws. `drives.list` can answer 403 under a Workspace sharing
     * policy, or 429, or 5xx — and this runs inside the ROOT listing, so letting
     * that escape would take a working My Drive listing down with it and leave
     * the picker empty. A failure degrades to no shared-drive rows plus a
     * `shared-drives-error` event, which is separate from the `error` event
     * precisely because the browse did NOT fail. A partial result is kept: if
     * page 3 of 5 fails, the drives already collected are still returned.
     */
    private async listSharedDriveFolders(): Promise<DriveFile[]> {
        const folders: DriveFile[] = []
        let pageToken: string | undefined

        // Bounded at 10 pages of 100. Someone in more than a thousand shared
        // drives is past what a flat picker list serves anyway, and the cap means
        // a malformed nextPageToken cannot spin here forever.
        for (let page = 0; page < 10; page++) {
            const params = new URLSearchParams({
                pageSize: '100',
                fields: 'nextPageToken,drives(id,name)',
                key: this.config.apiKey,
            })
            if (pageToken) params.set('pageToken', pageToken)

            let data: GoogleDrivesListResponse
            try {
                // oxlint-disable-next-line no-await-in-loop -- cursor pagination: each page's token comes from the previous response, so these cannot run in parallel
                const res = await this.apiRequest(
                    `${DRIVES_URL}?${params.toString()}`,
                    { method: 'GET' },
                )
                // oxlint-disable-next-line no-await-in-loop -- same round trip as the request above
                data = (await res.json()) as GoogleDrivesListResponse
            } catch (err) {
                // upup-catch: reported on shared-drives-error and swallowed, per
                // the contract above — the root listing must survive this.
                this.emitter?.emit('google-drive:shared-drives-error', {
                    error: err instanceof Error ? err : new Error(String(err)),
                })
                break
            }

            for (const drive of data.drives ?? []) {
                folders.push(
                    mapGoogleEntry({
                        id: drive.id,
                        name: drive.name,
                        mimeType: FOLDER_MIME,
                    }),
                )
            }

            pageToken = data.nextPageToken
            if (!pageToken) break
        }

        return folders
    }

    /** The virtual "Shared with me" entry, shaped like any other folder row. */
    private sharedWithMeFolder(): DriveFile {
        return mapGoogleEntry({
            id: SHARED_WITH_ME_FOLDER_ID,
            name: SHARED_WITH_ME_FOLDER_NAME,
            mimeType: FOLDER_MIME,
        })
    }

    // ── Plugin lifecycle ──

    configure(config: GoogleDriveConfig): this {
        this.config = config
        return this
    }

    getConfig(): Readonly<GoogleDriveConfig> {
        return this.config
    }

    init(emitter: EventEmitter): void {
        this.emitter = emitter
    }

    destroy(): void {
        this.emitter = null
    }

    // ── State management ──

    getState(): DriveState {
        return this.state
    }

    private setState(newState: DriveState): void {
        this.state = newState
        this.emitter?.emit('google-drive:state-change', { state: newState })
    }

    // ── Auth: accept token from GIS popup (called by React thin hook) ──

    setAccessToken(token: string, expiresIn?: number): void {
        const expiry = expiresIn ? Date.now() + expiresIn * 1000 : 0
        this.accessToken = token
        this.tokenExpiry = expiry

        storageSet(SK_ACCESS, token)
        if (expiry) storageSet(SK_EXPIRY, String(expiry))

        this.setState('authenticated')
    }

    // ── Auth: authenticate with token + fetch user info ──

    async authenticate(token: string, expiresIn?: number): Promise<void> {
        this.setState('authenticating')

        try {
            this.setAccessToken(token, expiresIn)

            // Fetch user profile
            let user:
                { name: string; email: string; picture?: string } | undefined
            try {
                user = await this.getUserInfo()
            } catch {
                // upup-catch: profile fetch is non-critical — authenticated event still emits without a user
            }

            this.setState('authenticated')
            this.emitter?.emit('google-drive:authenticated', { user })
        } catch (err) {
            this.setState('idle')
            this.emitter?.emit('google-drive:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'authenticate',
            })
            throw err
        }
    }

    // ── Auth: sign out ──

    signOut(): void {
        this.clearTokens()
        this.setState('idle')
        this.emitter?.emit('google-drive:signed-out', {})
    }

    // ── Auth: restore session from sessionStorage ──

    restoreSession(): boolean {
        const token = storageGet(SK_ACCESS)
        const expiry = storageGet(SK_EXPIRY)

        if (!token) return false

        this.accessToken = token
        this.tokenExpiry = expiry ? parseInt(expiry, 10) : 0

        // Check if token has expired
        if (this.tokenExpiry > 0 && Date.now() > this.tokenExpiry) {
            this.clearTokens()
            this.emitter?.emit('google-drive:session-expired', {})
            this.setState('session-expired')
            return false
        }

        this.setState('authenticated')
        return true
    }

    // ── Auth helpers ──

    isAuthenticated(): boolean {
        return this.state === 'authenticated' && this.accessToken !== null
    }

    getAccessToken(): string | null {
        return this.accessToken
    }

    // ── User info ──

    async getUserInfo(): Promise<{
        name: string
        email: string
        picture?: string
    }> {
        const res = await this.apiRequest(USER_INFO_URL, { method: 'GET' })
        const data = (await res.json()) as GoogleUserInfoResponse
        return {
            name: data.name ?? '',
            email: data.email ?? '',
            ...(data.picture !== undefined ? { picture: data.picture } : {}),
        }
    }

    // ── File operations: list files ──

    async loadFiles(folderId?: string): Promise<{
        files: DriveFile[]
        folderId: string
        hasMore: boolean
        cursor?: string
    }> {
        this.setState('browsing')

        try {
            const parentId = folderId || 'root'

            const params = new URLSearchParams({
                q: this.listQuery(parentId),
                fields: 'nextPageToken,files(fileExtension,id,mimeType,name,parents,size,thumbnailLink)',
                key: this.config.apiKey,
                pageSize: '1000',
                ...this.sharedDriveParams(),
            })

            const res = await this.apiRequest(
                `${FILES_URL}?${params.toString()}`,
                { method: 'GET' },
            )

            const data = (await res.json()) as GoogleFilesListResponse
            const ownFiles: DriveFile[] = (data.files ?? []).map(mapGoogleEntry)

            // The two doors out of My Drive, on the root page only and never on a
            // continuation page, so they appear exactly once (#391). They go
            // FIRST: a root with more than one page appends its later pages to
            // the end of the list, which would bury them under My Drive files
            // that arrived after them.
            const files: DriveFile[] =
                this.config.sharedDrives && parentId === 'root'
                    ? [
                          ...(await this.listSharedDriveFolders()),
                          this.sharedWithMeFolder(),
                          ...ownFiles,
                      ]
                    : ownFiles

            const hasMore = !!data.nextPageToken
            const cursor = hasMore
                ? JSON.stringify({
                      folderId: parentId,
                      pageToken: data.nextPageToken,
                  })
                : undefined

            this.setState('authenticated')
            this.emitter?.emit('google-drive:files-loaded', {
                files,
                folderId: parentId,
                hasMore,
                cursor,
            })

            return {
                files,
                folderId: parentId,
                hasMore,
                ...(cursor !== undefined ? { cursor } : {}),
            }
        } catch (err) {
            this.setState('authenticated')
            this.emitter?.emit('google-drive:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'loadFiles',
            })
            throw err
        }
    }

    // ── File operations: continue listing (pagination) ──

    async loadMoreFiles(cursor: string): Promise<{
        files: DriveFile[]
        hasMore: boolean
        cursor?: string
    }> {
        try {
            const { folderId, pageToken } = JSON.parse(cursor) as {
                folderId: string
                pageToken: string
            }
            const params = new URLSearchParams({
                // Same builder as loadFiles, so page 2 of the "Shared with me"
                // view stays a sharedWithMe query and does not silently become
                // `'__upup_shared_with_me__' in parents`, which matches nothing.
                q: this.listQuery(folderId),
                fields: 'nextPageToken,files(fileExtension,id,mimeType,name,parents,size,thumbnailLink)',
                key: this.config.apiKey,
                pageSize: '1000',
                pageToken,
                ...this.sharedDriveParams(),
            })

            const res = await this.apiRequest(
                `${FILES_URL}?${params.toString()}`,
                { method: 'GET' },
            )

            const data = (await res.json()) as GoogleFilesListResponse
            const files: DriveFile[] = (data.files ?? []).map(mapGoogleEntry)
            const hasMore = !!data.nextPageToken
            const nextCursor = hasMore
                ? JSON.stringify({ folderId, pageToken: data.nextPageToken })
                : undefined

            return {
                files,
                hasMore,
                ...(nextCursor !== undefined ? { cursor: nextCursor } : {}),
            }
        } catch (err) {
            this.emitter?.emit('google-drive:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'loadMoreFiles',
            })
            throw err
        }
    }

    // ── File operations: download multiple files ──

    async downloadFiles(driveFiles: DriveFile[]): Promise<File[]> {
        const results: File[] = []

        for (const driveFile of driveFiles) {
            if (driveFile.isFolder) continue

            try {
                const file = await this.downloadFile(driveFile)
                if (file) {
                    results.push(file)
                }
            } catch (err) {
                this.emitter?.emit('google-drive:error', {
                    error: err instanceof Error ? err : new Error(String(err)),
                    action: 'downloadFiles',
                })
                // Continue downloading remaining files
            }
        }

        return results
    }

    // ── File operations: download single file ──

    async downloadFile(driveFile: DriveFile): Promise<File | null> {
        if (isWorkspaceFile(driveFile.mimeType)) {
            return this.downloadWorkspaceFile(driveFile)
        }
        return this.downloadRegularFile(driveFile)
    }

    // ── Private: download regular (non-Workspace) file ──

    private async downloadRegularFile(
        driveFile: DriveFile,
    ): Promise<File | null> {
        // `supportsAllDrives` is the files.get half of #391: without it a file
        // the widened listing surfaced answers 404 on download, which would make
        // the picker list shared-drive files it cannot fetch. `corpora` and
        // `includeItemsFromAllDrives` are files.list-only and stay out of here.
        const params = new URLSearchParams({
            key: this.config.apiKey,
            alt: 'media',
            ...(this.config.sharedDrives ? { supportsAllDrives: 'true' } : {}),
        })

        const res = await this.apiRequest(
            `${FILES_URL}/${driveFile.id}?${params.toString()}`,
            { method: 'GET' },
        )

        const blob = await res.blob()
        return new File([blob], driveFile.name, {
            type: blob.type || driveFile.mimeType || 'application/octet-stream',
        })
    }

    // ── Private: download Google Workspace file via export ──

    private async downloadWorkspaceFile(
        driveFile: DriveFile,
    ): Promise<File | null> {
        const exportUrl = getExportUrl(driveFile.id, driveFile.mimeType)
        if (!exportUrl) return null

        const mapping = WORKSPACE_EXPORT_MAP[driveFile.mimeType]
        if (!mapping) return null

        const res = await this.apiRequest(exportUrl, { method: 'GET' })
        const blob = await res.blob()

        // Build filename with correct extension
        const baseName = driveFile.name.replace(/\.[^.]+$/, '')
        const fileName = `${baseName}.${mapping.ext}`

        return new File([blob], fileName, {
            type: mapping.exportMime,
        })
    }

    // ── Private: authenticated API request ──

    private async apiRequest(
        url: string,
        options: RequestInit,
    ): Promise<Response> {
        this.ensureValidToken()

        const headers = new Headers(options.headers ?? {})
        headers.set('Authorization', `Bearer ${this.accessToken}`)

        const res = await fetch(url, { ...options, headers })

        if (res.ok) return res

        const errorText = await res.text()

        // Handle 401 — token expired
        if (res.status === 401) {
            this.emitter?.emit('google-drive:session-expired', {})
            this.clearTokens()
            this.setState('session-expired')
        }

        throw new UpupNetworkError(
            `Google Drive API error (${res.status}): ${errorText}`,
            res.status,
        )
    }

    // ── Private: token management ──

    private clearTokens(): void {
        this.accessToken = null
        this.tokenExpiry = 0
        storageDel(SK_ACCESS)
        storageDel(SK_EXPIRY)
    }

    private ensureValidToken(): void {
        if (!this.accessToken) {
            throw new UpupAuthError(
                'Not authenticated — no access token',
                'Google Drive',
            )
        }

        // Check if token has expired
        if (this.tokenExpiry > 0 && Date.now() > this.tokenExpiry) {
            this.clearTokens()
            this.emitter?.emit('google-drive:session-expired', {})
            this.setState('session-expired')
            throw new UpupAuthError('Access token has expired', 'Google Drive')
        }
    }
}
