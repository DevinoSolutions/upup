import type { BoxConfig } from './configs'
import type { DriveFile, DriveUser } from './types'
import { guessMimeType } from './mime'
import { PopupOAuthPlugin, type PopupOAuthSpec } from './popup-oauth-plugin'

// ── Box API endpoints ──
const AUTH_URL = 'https://account.box.com/api/oauth2/authorize'
const TOKEN_URL = 'https://api.box.com/oauth2/token'
const USER_URL = 'https://api.box.com/2.0/users/me'
const FOLDERS_URL = 'https://api.box.com/2.0/folders'
const FILES_URL = 'https://api.box.com/2.0/files'
const SEARCH_URL = 'https://api.box.com/2.0/search'

// ── Box entry → DriveFile mapper ──

function mapEntry(entry: Record<string, unknown>): DriveFile {
    const type = entry.type as string
    const isFolder = type === 'folder'
    return {
        id: (entry.id as string) ?? '',
        name: (entry.name as string) ?? '',
        path: (entry.id as string) ?? '', // Box uses IDs for navigation, not paths
        size: isFolder ? 0 : ((entry.size as number) ?? 0),
        mimeType: isFolder ? 'folder' : guessMimeType(entry.name as string),
        isFolder,
        thumbnail: undefined,
        modifiedAt: (entry.modified_at as string) ?? undefined,
    }
}

// ── BoxPlugin ──

export class BoxPlugin extends PopupOAuthPlugin {
    readonly spec: PopupOAuthSpec = {
        id: 'box',
        displayName: 'Box',
        eventPrefix: 'box',
        popupName: 'UpupBoxAuth',
        authUrl: AUTH_URL,
        tokenUrl: TOKEN_URL,
        redirectPath: '/box_redirect',
        storageKeys: {
            access: 'upup_box_access_token',
            refresh: 'upup_box_refresh_token',
            expiry: 'upup_box_token_expiry',
        },
        // Box scopes are configured on the Box app, not sent on the authorize URL.
    }

    configure(config: BoxConfig): this {
        return super.configure(config)
    }

    getConfig(): Readonly<BoxConfig> {
        return this.config
    }

    // ── File operations: list folder ──

    async loadFiles(
        folderId = '0',
        offset = '0',
    ): Promise<{
        files: DriveFile[]
        folderId: string
        hasMore: boolean
        cursor?: string
    }> {
        this.setState('browsing')

        try {
            const params = new URLSearchParams({
                fields: 'id,name,type,size,modified_at',
                limit: '1000',
                offset,
            })

            const res = await this.apiRequest(
                `${FOLDERS_URL}/${folderId}/items?${params.toString()}`,
                { method: 'GET' },
            )

            const data = await res.json()
            const files: DriveFile[] = (data.entries ?? []).map(mapEntry)

            // Box's /folders/{id}/items returns total_count by default (independent
            // of the fields param). When it's absent, loaded < loaded is always
            // false — a safe length-based fallback rather than assuming more pages.
            const off = Number(data.offset ?? offset ?? 0)
            const loaded = off + files.length
            const hasMore = loaded < Number(data.total_count ?? loaded)
            const cursor = hasMore ? `${folderId}:${loaded}` : undefined

            this.setState('authenticated')
            this.emitter?.emit('box:files-loaded', {
                files,
                folderId,
                hasMore,
                cursor,
            })

            return { files, folderId, hasMore, cursor }
        } catch (err) {
            this.setState('authenticated')
            this.emitter?.emit('box:error', {
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
        const [folderId, offsetStr] = cursor.split(':')
        try {
            const params = new URLSearchParams({
                fields: 'id,name,type,size,modified_at',
                limit: '1000',
                offset: offsetStr ?? '0',
            })

            const res = await this.apiRequest(
                `${FOLDERS_URL}/${folderId}/items?${params.toString()}`,
                { method: 'GET' },
            )

            const data = await res.json()
            const files: DriveFile[] = (data.entries ?? []).map(mapEntry)

            const off = Number(data.offset ?? offsetStr ?? 0)
            const loaded = off + files.length
            const hasMore = loaded < Number(data.total_count ?? loaded)
            const nextCursor = hasMore ? `${folderId}:${loaded}` : undefined

            return { files, hasMore, cursor: nextCursor }
        } catch (err) {
            this.emitter?.emit('box:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'loadMoreFiles',
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
                this.emitter?.emit('box:error', {
                    error: err instanceof Error ? err : new Error(String(err)),
                    action: 'downloadFiles',
                })
                // Continue downloading remaining files
            }
        }

        return results
    }

    // ── File operations: load all files in folder recursively ──

    async loadAllFilesInFolder(folderId: string): Promise<DriveFile[]> {
        const allFiles: DriveFile[] = []

        try {
            const { files } = await this.loadFiles(folderId)
            for (const file of files) {
                if (file.isFolder) {
                    const nested = await this.loadAllFilesInFolder(file.id)
                    allFiles.push(...nested)
                } else {
                    allFiles.push(file)
                }
            }
            return allFiles
        } catch (err) {
            this.emitter?.emit('box:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'loadAllFilesInFolder',
            })
            throw err
        }
    }

    // ── File operations: search ──

    async searchFiles(query: string): Promise<DriveFile[]> {
        try {
            const params = new URLSearchParams({
                query,
                fields: 'id,name,type,size,modified_at',
                limit: '100',
            })

            const res = await this.apiRequest(
                `${SEARCH_URL}?${params.toString()}`,
                { method: 'GET' },
            )

            const data = await res.json()
            const entries = data.entries ?? []
            return entries.map(mapEntry)
        } catch (err) {
            this.emitter?.emit('box:error', {
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

    // ── Private: download a single file ──

    private async downloadSingleFile(
        driveFile: DriveFile,
    ): Promise<File | null> {
        const res = await this.apiRequest(
            `${FILES_URL}/${driveFile.id}/content`,
            { method: 'GET' },
        )

        const blob = await res.blob()
        return new File([blob], driveFile.name, {
            type: blob.type || driveFile.mimeType || 'application/octet-stream',
        })
    }

    // ── Private: fetch user profile ──

    protected async fetchUserProfile(): Promise<DriveUser> {
        const res = await this.apiRequest(USER_URL, { method: 'GET' })
        const data = await res.json()
        return {
            name: data.name ?? '',
            email: data.login ?? '',
        }
    }
}
