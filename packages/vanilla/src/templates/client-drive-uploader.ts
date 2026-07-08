import { html, type TemplateResult } from 'lit-html'
import { FileSource } from '@upup/core'
import type { DriveFile, DriveFolder } from '@upup/core'
import type { UploaderContext } from '../lib/types'
import { driveAuthFallback } from './shared/drive-auth-fallback'
import { driveBrowser } from './shared/drive-browser'

const META: Record<string, { providerName: string; slot: string }> = {
    [FileSource.GOOGLE_DRIVE]: {
        providerName: 'Google Drive',
        slot: 'google-drive-uploader',
    },
    [FileSource.ONE_DRIVE]: {
        providerName: 'OneDrive',
        slot: 'one-drive-uploader',
    },
    [FileSource.DROPBOX]: { providerName: 'Dropbox', slot: 'dropbox-uploader' },
    [FileSource.BOX]: { providerName: 'Box', slot: 'box-uploader' },
}

export function clientDriveUploader(
    ctx: UploaderContext,
    source: FileSource,
): TemplateResult {
    const controller = ctx.controllers.getDrive(source)
    const st = controller.getSnapshot()
    const meta = META[source]
    if (!meta) return html``
    // Unified auth gate over the real DriveBrowserState fields:
    //  - GIS (Google): readiness/cancel signalled by isAuthReady / authCancelled / token.
    //  - popup (OneDrive/Dropbox/Box): initGis never runs, so isAuthReady/authCancelled/token
    //    stay default; readiness is !isAuthenticated && !isLoading (svelte's popup $token is a
    //    synthetic alias of isAuthenticated). The `!isAuthenticated` term is a no-op on the GIS
    //    path, so Google behavior is unchanged.
    const notAuthed =
        !st.token && !st.isAuthenticated && (st.isAuthReady || !st.isLoading)
    if (notAuthed) {
        // Only the GIS provider (Google) wires error into the auth-fallback, matching
        // react/vue/svelte's GoogleDriveUploader — the popup providers (OneDrive/Dropbox/Box)
        // never surface an error at this pre-auth stage in any other framework either.
        return driveAuthFallback(ctx, {
            providerName: meta.providerName,
            onRetry: () => {
                controller.retryAuth()
            },
            error: source === FileSource.GOOGLE_DRIVE ? st.error : undefined,
            dataUpupSlot: meta.slot,
        })
    }
    return driveBrowser(ctx, {
        driveFiles: st.folder,
        user: st.user,
        handleSignOut: () => {
            controller.signOut()
        },
        dataUpupSlot: meta.slot,
        path: st.path,
        setPath: (p: DriveFolder[]) => {
            controller.setPath(p)
        },
        isClickLoading: st.isClickLoading,
        handleClick: (file: DriveFile) => {
            controller.handleClick(file)
        },
        selectedFiles: st.selectedFiles,
        showLoader: st.showLoader,
        handleSubmit: () => {
            void controller.handleSubmit()
        },
        handleCancelDownload: () => {
            controller.handleCancelDownload()
        },
        onSelectCurrentFolder: () => {
            void controller.onSelectCurrentFolder()
        },
        error: st.error,
        hasMore: st.hasMore,
        isLoadingMore: st.isLoadingMore,
        loadMore: () => controller.loadMore(),
    })
}
