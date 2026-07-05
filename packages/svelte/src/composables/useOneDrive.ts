import { onMount, onDestroy } from 'svelte'
import { derived } from 'svelte/store'
import {
    ONE_DRIVE_DESCRIPTOR,
    type DriveFile,
    type DriveFolder,
} from '@upup/core'
import { DriveBrowserController } from '@upup/core/internal'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/uploader-context'
import { toReadable } from '../lib/to-readable'

export function useOneDrive() {
    const { core } = useUploaderRuntime()
    const { setActiveSource } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    const controller = new DriveBrowserController(core!, ONE_DRIVE_DESCRIPTOR, {
        onFilesSelected: files => {
            setFiles(files)
        },
        onClose: () => setActiveSource(undefined),
    })

    const state = toReadable(controller)

    onMount(() => controller.init())
    onDestroy(() => controller.destroy())

    return {
        user: derived(state, $s => $s.user),
        oneDriveFiles: derived(state, $s => $s.folder),
        signOut: () => controller.signOut(),
        signIn: () => controller.signIn(),
        authenticate: () => controller.signIn(),
        token: derived(state, $s =>
            $s.isAuthenticated ? 'active' : undefined,
        ),
        isAuthenticated: derived(state, $s => $s.isAuthenticated),
        isLoading: derived(state, $s => $s.isLoading),
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

export default useOneDrive
