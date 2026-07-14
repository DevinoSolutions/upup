import type { DropboxConfig } from './configs'
import type { DriveFile, DriveUser } from './types'
import { guessMimeType } from './mime'
import { PopupOAuthPlugin, type PopupOAuthSpec } from './popup-oauth-plugin'
import { UpupNetworkError } from '../errors'

// ── Dropbox API endpoints ──
const AUTH_URL = 'https://www.dropbox.com/oauth2/authorize'
const TOKEN_URL = 'https://api.dropbox.com/oauth2/token'
const LIST_FOLDER_URL = 'https://api.dropbox.com/2/files/list_folder'
const LIST_FOLDER_CONTINUE_URL =
    'https://api.dropbox.com/2/files/list_folder/continue'
const SEARCH_URL = 'https://api.dropbox.com/2/files/search_v2'
const USER_INFO_URL = 'https://api.dropbox.com/2/users/get_current_account'
const TEMP_LINK_URL = 'https://api.dropbox.com/2/files/get_temporary_link'

const OAUTH_SCOPES =
    'files.metadata.read files.content.read files.content.write account_info.read'

// ── Dropbox API response shapes (only the fields this file reads) ──

interface DropboxListFolderResponse {
    entries?: Record<string, unknown>[]
    cursor?: string
    has_more?: boolean
}

interface DropboxSearchMatch {
    metadata: { metadata: Record<string, unknown> }
}

interface DropboxSearchResponse {
    matches?: DropboxSearchMatch[]
}

interface DropboxTempLinkResponse {
    link?: string
}

interface DropboxUserResponse {
    name?: { display_name?: string }
    email?: string
}

// ── Dropbox entry → DriveFile mapper ──

function mapEntry(entry: Record<string, unknown>): DriveFile {
    const tag = entry['.tag'] as string
    const isFolder = tag === 'folder'
    return {
        id: (entry.id as string | undefined) ?? '',
        name: (entry.name as string | undefined) ?? '',
        path: (entry.path_display as string | undefined) ?? '',
        size: isFolder ? 0 : ((entry.size as number | undefined) ?? 0),
        mimeType: isFolder ? 'folder' : guessMimeType(entry.name as string),
        isFolder,
        thumbnail: undefined,
        modifiedAt: (entry.server_modified as string | undefined) ?? undefined,
    }
}

// ── DropboxPlugin ──

export class DropboxPlugin extends PopupOAuthPlugin {
    readonly spec: PopupOAuthSpec = {
        id: 'dropbox',
        displayName: 'Dropbox',
        eventPrefix: 'dropbox',
        popupName: 'UpupDropboxAuth',
        authUrl: AUTH_URL,
        tokenUrl: TOKEN_URL,
        redirectPath: '/dp_redirect',
        storageKeys: {
            access: 'upup_dropbox_access_token',
            refresh: 'upup_dropbox_refresh_token',
            expiry: 'upup_dropbox_token_expiry',
        },
        scopes: OAUTH_SCOPES,
        authParams: { token_access_type: 'offline' },
    }

    override configure(config: DropboxConfig): this {
        return super.configure(config)
    }

    override getConfig(): Readonly<DropboxConfig> {
        return this.config
    }

    // ── File operations: list folder ──

    async loadFiles(path = ''): Promise<{
        files: DriveFile[]
        hasMore: boolean
        cursor?: string
    }> {
        this.setState('browsing')

        try {
            const res = await this.apiRequest(LIST_FOLDER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path,
                    recursive: false,
                    include_media_info: true,
                    include_deleted: false,
                    include_has_explicit_shared_members: false,
                }),
            })

            const data = (await res.json()) as DropboxListFolderResponse
            const files: DriveFile[] = (data.entries ?? []).map(mapEntry)

            this.setState('authenticated')
            this.emitter?.emit('dropbox:files-loaded', {
                files,
                path,
                hasMore: !!data.has_more,
                cursor: data.cursor,
            })

            return {
                files,
                hasMore: !!data.has_more,
                ...(data.cursor !== undefined ? { cursor: data.cursor } : {}),
            }
        } catch (err) {
            this.setState('authenticated')
            this.emitter?.emit('dropbox:error', {
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
            const res = await this.apiRequest(LIST_FOLDER_CONTINUE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cursor }),
            })

            const data = (await res.json()) as DropboxListFolderResponse
            const files: DriveFile[] = (data.entries ?? []).map(mapEntry)

            // No files-loaded emit here: the controller's loadMore() appends this
            // return value directly (F-125) — re-emitting would make the controller
            // process it a second time as if it were a fresh folder load.
            return {
                files,
                hasMore: !!data.has_more,
                ...(data.cursor !== undefined ? { cursor: data.cursor } : {}),
            }
        } catch (err) {
            this.emitter?.emit('dropbox:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'loadMoreFiles',
            })
            throw err
        }
    }

    // ── File operations: load all files in folder recursively ──

    async loadAllFilesInFolder(folderPath: string): Promise<DriveFile[]> {
        const allFiles: DriveFile[] = []

        try {
            const initialRes = await this.apiRequest(LIST_FOLDER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: folderPath,
                    recursive: true,
                    include_media_info: true,
                }),
            })

            let data = (await initialRes.json()) as DropboxListFolderResponse
            const entries: Record<string, unknown>[] = data.entries ?? []

            while (data.has_more) {
                const contRes = await this.apiRequest(
                    LIST_FOLDER_CONTINUE_URL,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cursor: data.cursor }),
                    },
                )
                data = (await contRes.json()) as DropboxListFolderResponse
                entries.push(...(data.entries ?? []))
            }

            for (const entry of entries) {
                const file = mapEntry(entry)
                if (!file.isFolder) allFiles.push(file)
            }

            return allFiles
        } catch (err) {
            this.emitter?.emit('dropbox:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'loadAllFilesInFolder',
            })
            throw err
        }
    }

    // ── File operations: download files ──

    async downloadFiles(driveFiles: DriveFile[]): Promise<File[]> {
        const results: File[] = []

        for (const driveFile of driveFiles) {
            if (driveFile.isFolder) continue

            try {
                const file = await this.downloadSingleFile(driveFile)
                if (file) {
                    results.push(file)
                }
            } catch (err) {
                this.emitter?.emit('dropbox:error', {
                    error: err instanceof Error ? err : new Error(String(err)),
                    action: 'downloadFiles',
                })
                // Continue downloading remaining files
            }
        }

        return results
    }

    // ── File operations: search ──

    async searchFiles(query: string, path?: string): Promise<DriveFile[]> {
        try {
            const body: Record<string, unknown> = {
                query,
                options: {
                    max_results: 100,
                    file_status: { '.tag': 'active' },
                },
            }
            if (path) {
                body.options = {
                    ...(body.options as object),
                    path,
                }
            }

            const res = await this.apiRequest(SEARCH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            const data = (await res.json()) as DropboxSearchResponse
            const matches = data.matches ?? []
            return matches.map(m => mapEntry(m.metadata.metadata))
        } catch (err) {
            this.emitter?.emit('dropbox:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'searchFiles',
            })
            throw err
        }
    }

    // ── Provider hooks required by the base ──

    protected mapEntry(entry: Record<string, unknown>): DriveFile {
        return mapEntry(entry)
    }

    // ── Private: download a single file via temporary link ──

    private async downloadSingleFile(
        driveFile: DriveFile,
    ): Promise<File | null> {
        // Get temporary download link
        const linkRes = await this.apiRequest(TEMP_LINK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: driveFile.path }),
        })

        const linkData = (await linkRes.json()) as DropboxTempLinkResponse
        const downloadLink = linkData.link

        if (!downloadLink) {
            throw new UpupNetworkError(
                `No download link returned for ${driveFile.name}`,
            )
        }

        // Download the file content via the temporary link
        const downloadRes = await fetch(downloadLink, { method: 'GET' })
        if (!downloadRes.ok) {
            throw new UpupNetworkError(
                `Download failed (${downloadRes.status}) for ${driveFile.name}`,
                downloadRes.status,
            )
        }

        const blob = await downloadRes.blob()
        return new File([blob], driveFile.name, {
            type: blob.type || driveFile.mimeType || 'application/octet-stream',
        })
    }

    // ── Private: fetch user profile ──

    protected async fetchUserProfile(): Promise<DriveUser> {
        const res = await this.apiRequest(USER_INFO_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: null,
        })

        const data = (await res.json()) as DropboxUserResponse
        return {
            name: data.name?.display_name ?? '',
            email: data.email ?? '',
        }
    }
}
