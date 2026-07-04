import type { UpupPlugin } from '../plugin'
import type { EventEmitter } from '../events'
import type { DriveFile, DriveListPage, DriveUser } from './types'

/**
 * The single drive-adapter contract. Extends the generic UpupPlugin registration
 * base with the adapter lifecycle (id/init/destroy) AND the runtime surface the
 * DriveBrowserController drives. The four concrete *Plugin classes implement this.
 * Members marked optional may be omitted by a future provider that doesn't need them:
 * authenticate is implemented by all current providers but only invoked on the GIS path;
 * authenticateViaPopup/loadAllFilesInFolder are popup-provider-only (absent on GIS);
 * getConfig is implemented by all and read for the GIS client id.
 *
 * Folds in the formerly-inline DriveBrowserPlugin (was in drive-browser-controller.ts)
 * so the declared lifecycle interface and the driven runtime surface are one type.
 */
export interface DrivePlugin extends UpupPlugin {
    readonly id: string
    init(emitter: EventEmitter): void
    destroy(): void
    // ── runtime surface the DriveBrowserController drives ──
    restoreSession(): boolean
    isAuthenticated(): boolean
    getAccessToken(): string | null
    // box/dropbox/onedrive resolve to `… | null`; keep all three so a typed getPlugin()
    // still satisfies this — the `if (userInfo)` guards in the controller handle it.
    getUserInfo(): Promise<DriveUser | null | undefined>
    loadFiles(folderArg?: string): Promise<unknown>
    downloadFiles(files: DriveFile[]): Promise<File[]>
    signOut(): void
    authenticate?(token: string, expiresIn?: number): Promise<void>
    authenticateViaPopup?(): Promise<void>
    loadAllFilesInFolder?(folderArg: string): Promise<DriveFile[]>
    getConfig?(): unknown
    // optional (matches the existing authenticateViaPopup/loadAllFilesInFolder style);
    // the controller guards with `plugin.loadMoreFiles?`. All four current providers
    // implement it (F-125) — cursor is the opaque continuation token from the most
    // recent files-loaded/loadMoreFiles payload.
    loadMoreFiles?(cursor: string): Promise<DriveListPage>
}
