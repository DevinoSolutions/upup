import type { UpupPlugin } from '../plugin'
import type { EventEmitter } from '../events'
import type { DriveFile, DriveUser } from './types'

/**
 * The single drive-adapter contract. Extends the generic UpupPlugin registration
 * base with the adapter lifecycle (id/init/destroy) AND the runtime surface the
 * AdapterBrowserController drives. The four concrete *Plugin classes implement this;
 * optional members are only present on some providers (authenticate = GIS providers;
 * authenticateViaPopup/loadAllFilesInFolder = popup providers; getConfig = GIS client id).
 *
 * Folds in the formerly-inline DriveBrowserPlugin (was in adapter-browser-controller.ts)
 * so the declared lifecycle interface and the driven runtime surface are one type.
 */
export interface AdapterPlugin extends UpupPlugin {
  readonly id: string
  init(emitter: EventEmitter): void
  destroy(): void
  // ── runtime surface the AdapterBrowserController drives ──
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
}
