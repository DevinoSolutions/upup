import { FileSource } from '@upup/core'
import type { DriveFile, DriveFolder } from '@upup/core'
import type { RootContext } from '../lib/types'
import { driveAuthFallback } from './shared/drive-auth-fallback'
import { driveBrowser } from './shared/drive-browser'

const META: Record<string, { providerName: string; slot: string }> = {
  [FileSource.GOOGLE_DRIVE]: { providerName: 'Google Drive', slot: 'google-drive-uploader' },
  [FileSource.ONE_DRIVE]: { providerName: 'OneDrive', slot: 'onedrive-uploader' },
  [FileSource.DROPBOX]: { providerName: 'Dropbox', slot: 'dropbox-uploader' },
  [FileSource.BOX]: { providerName: 'Box', slot: 'box-uploader' },
}

export function clientDriveUploader(ctx: RootContext, source: FileSource) {
  const controller = ctx.controllers.getDrive(source)
  const st = controller.getSnapshot()
  const meta = META[source]
  // Unified auth gate over the real AdapterBrowserState fields:
  //  - GIS (Google): readiness/cancel signalled by isAuthReady / authCancelled / token.
  //  - popup (OneDrive/Dropbox/Box): initGis never runs, so isAuthReady/authCancelled/token
  //    stay default; readiness is !isAuthenticated && !isLoading (svelte's popup $token is a
  //    synthetic alias of isAuthenticated). The `!isAuthenticated` term is a no-op on the GIS
  //    path, so Google behavior is unchanged.
  const notAuthed =
    !st.token && !st.isAuthenticated && (st.isAuthReady || !st.isLoading)
  if (notAuthed) {
    return driveAuthFallback(ctx, { providerName: meta.providerName, onRetry: () => controller.retryAuth(), dataUpupSlot: meta.slot })
  }
  return driveBrowser(ctx, {
    driveFiles: st.folder as DriveFolder | undefined,
    user: st.user,
    handleSignOut: () => controller.signOut(),
    dataUpupSlot: meta.slot,
    path: st.path as DriveFolder[],
    setPath: (p: DriveFolder[]) => controller.setPath(p),
    isClickLoading: st.isClickLoading,
    handleClick: (file: DriveFile) => controller.handleClick(file),
    selectedFiles: st.selectedFiles as DriveFile[],
    showLoader: st.showLoader,
    handleSubmit: () => controller.handleSubmit(),
    handleCancelDownload: () => controller.handleCancelDownload(),
    onSelectCurrentFolder: () => controller.onSelectCurrentFolder(),
  })
}
