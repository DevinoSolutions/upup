import { onMount, onDestroy } from 'svelte'
import { derived } from 'svelte/store'
import { GOOGLE_DRIVE_DESCRIPTOR, type DriveFile, type DriveFolder } from '@upup/core'
import { DriveBrowserController } from '@upup/core/internal'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/uploader-context'
import { toReadable } from '../lib/to-readable'

export function useGoogleDrive() {
    const { core } = useUploaderRuntime()
    const { setActiveSource } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    // core is always non-null inside <UpupUploader /> — the injection throws otherwise.
    const controller = new DriveBrowserController(
        core!,
        GOOGLE_DRIVE_DESCRIPTOR,
        {
            onFilesSelected: files => {
                setFiles(files)
            },
            onClose: () => setActiveSource(undefined),
        },
    )

    const state = toReadable(controller)

    onMount(() => controller.init())
    onDestroy(() => controller.destroy())

    return {
        user: derived(state, $s => $s.user),
        googleFiles: derived(state, $s => $s.folder),
        token: derived(state, $s => $s.token),
        authCancelled: derived(state, $s => $s.authCancelled),
        isAuthReady: derived(state, $s => $s.isAuthReady),
        retryAuth: () => controller.retryAuth(),
        handleSignOut: async () => {
            controller.signOut()
        },
        path: derived(state, $s => $s.path),
        setPath: (newPath: DriveFolder[]) => controller.setPath(newPath),
        handleClick: (file: DriveFile) => controller.handleClick(file),
        selectedFiles: derived(state, $s => $s.selectedFiles),
        showLoader: derived(state, $s => $s.showLoader),
        handleSubmit: () => controller.handleSubmit(),
        handleCancelDownload: () => controller.handleCancelDownload(),
        onSelectCurrentFolder: () => controller.onSelectCurrentFolder(),
        isClickLoading: derived(state, $s => $s.isClickLoading),
        error: derived(state, $s => $s.error),
        hasMore: derived(state, $s => $s.hasMore),
        isLoadingMore: derived(state, $s => $s.isLoadingMore),
        loadMore: () => controller.loadMore(),
    }
}

export default useGoogleDrive
