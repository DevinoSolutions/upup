import type { OneDriveConfig } from './configs'
import type { DriveFile, DriveUser } from './types'
import { guessMimeType } from './mime'
import { PopupOAuthPlugin, type PopupOAuthSpec } from './popup-oauth-plugin'
import { UpupNetworkError } from '../errors'

// ── Microsoft OAuth2 / Graph API endpoints ──
const AUTH_URL =
    'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

const OAUTH_SCOPES = 'user.read files.readwrite.all offline_access'

// ── Graph API query params for file listing ──
const FILE_SELECT = 'id,name,folder,file,size,@microsoft.graph.downloadUrl'
const FILE_EXPAND = 'thumbnails'

// ── Microsoft Graph item → DriveFile mapper ──

function mapGraphItem(item: Record<string, unknown>): DriveFile {
    const isFolder = !!item.folder
    const file = item.file as Record<string, unknown> | undefined
    const mimeType = isFolder
        ? 'folder'
        : ((file?.mimeType as string | undefined) ??
          guessMimeType(item.name as string))

    const thumbnails = item.thumbnails as
        Array<Record<string, unknown>> | undefined
    let thumbnail: string | undefined
    if (thumbnails && thumbnails.length > 0) {
        const thumbSet = thumbnails[0]
        const medium = thumbSet?.medium as Record<string, unknown> | undefined
        thumbnail = (medium?.url as string | undefined) ?? undefined
    }

    return {
        id: (item.id as string | undefined) ?? '',
        name: (item.name as string | undefined) ?? '',
        path: (item.id as string | undefined) ?? '', // OneDrive uses id-based navigation
        size: isFolder ? 0 : ((item.size as number | undefined) ?? 0),
        mimeType,
        isFolder,
        thumbnail,
        modifiedAt:
            (item.lastModifiedDateTime as string | undefined) ?? undefined,
    }
}

// ── OneDrivePlugin ──

export class OneDrivePlugin extends PopupOAuthPlugin {
    readonly spec: PopupOAuthSpec = {
        id: 'one-drive',
        displayName: 'OneDrive',
        eventPrefix: 'onedrive',
        popupName: 'UpupOneDriveAuth',
        authUrl: AUTH_URL,
        tokenUrl: TOKEN_URL,
        redirectPath: '/od_redirect',
        storageKeys: {
            access: 'upup_onedrive_access_token',
            refresh: 'upup_onedrive_refresh_token',
            expiry: 'upup_onedrive_token_expiry',
        },
        scopes: OAUTH_SCOPES,
        authParams: { response_mode: 'query' },
    }

    override configure(config: OneDriveConfig): this {
        return super.configure(config)
    }

    override getConfig(): Readonly<OneDriveConfig> {
        return this.config
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
            const path = folderId
                ? `/me/drive/items/${folderId}/children`
                : '/me/drive/root/children'

            const params = new URLSearchParams({
                $select: FILE_SELECT,
                $expand: FILE_EXPAND,
                $top: '200',
            })

            const data = await this.graphRequest(`${path}?${params.toString()}`)
            const items: Record<string, unknown>[] = (
                Array.isArray(data.value) ? data.value : []
            ) as Record<string, unknown>[]
            const files: DriveFile[] = items.map(mapGraphItem)
            const nextLink = data['@odata.nextLink'] as string | undefined
            const hasMore = !!nextLink

            this.setState('authenticated')
            this.emitter?.emit('onedrive:files-loaded', {
                files,
                folderId: folderId ?? 'root',
                hasMore,
                cursor: nextLink,
            })

            return {
                files,
                folderId: folderId ?? 'root',
                hasMore,
                ...(nextLink !== undefined ? { cursor: nextLink } : {}),
            }
        } catch (err) {
            this.setState('authenticated')
            this.emitter?.emit('onedrive:error', {
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
            // cursor IS the absolute @odata.nextLink URL; graphRequest already
            // tolerates an absolute URL (path.startsWith('http')), so no new fetch
            // plumbing is needed here.
            const data = await this.graphRequest(cursor)
            const items: Record<string, unknown>[] = (
                Array.isArray(data.value) ? data.value : []
            ) as Record<string, unknown>[]
            const files: DriveFile[] = items.map(mapGraphItem)
            const nextLink = data['@odata.nextLink'] as string | undefined

            return {
                files,
                hasMore: !!nextLink,
                ...(nextLink !== undefined ? { cursor: nextLink } : {}),
            }
        } catch (err) {
            this.emitter?.emit('onedrive:error', {
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
                this.emitter?.emit('onedrive:error', {
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
            this.emitter?.emit('onedrive:error', {
                error: err instanceof Error ? err : new Error(String(err)),
                action: 'loadAllFilesInFolder',
            })
            throw err
        }
    }

    // ── Provider hooks required by the base ──

    protected mapEntry(entry: Record<string, unknown>): DriveFile {
        return mapGraphItem(entry)
    }

    // ── Private: fetch user profile (unguarded — called once tokens are set
    // but before isAuthenticated() flips, and again via the public getUserInfo) ──

    protected async fetchUserProfile(): Promise<DriveUser> {
        const data = await this.graphRequest('/me')
        const displayName = data.displayName
        const mail = data.mail
        const userPrincipalName = data.userPrincipalName
        return {
            name: typeof displayName === 'string' ? displayName : '',
            email:
                typeof mail === 'string'
                    ? mail
                    : typeof userPrincipalName === 'string'
                      ? userPrincipalName
                      : '',
        }
    }

    // ── Private: Microsoft Graph API request (delegates auth/refresh/retry to
    // the base apiRequest; returns parsed JSON, tolerating absolute URLs) ──

    private async graphRequest(
        path: string,
        options: RequestInit = {},
    ): Promise<Record<string, unknown>> {
        const url = path.startsWith('http') ? path : `${GRAPH_BASE}${path}`
        const res = await this.apiRequest(url, options)
        return (await res.json()) as Record<string, unknown>
    }

    // ── Private: download a single file ──

    private async downloadSingleFile(
        driveFile: DriveFile,
    ): Promise<File | null> {
        // First try to get the download URL from item metadata
        const itemData = await this.graphRequest(
            `/me/drive/items/${driveFile.id}?select=@microsoft.graph.downloadUrl`,
        )

        const downloadUrl =
            (itemData['@microsoft.graph.downloadUrl'] as string | undefined) ??
            (itemData['@content.downloadUrl'] as string | undefined)

        if (!downloadUrl) {
            throw new UpupNetworkError(
                `No download URL available for ${driveFile.name}`,
            )
        }

        // Download the file content via the download URL (no auth needed)
        const downloadRes = await fetch(downloadUrl, { method: 'GET' })
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
}
