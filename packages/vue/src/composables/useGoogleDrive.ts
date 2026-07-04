import { shallowRef, computed, onMounted, onUnmounted } from 'vue'
import {
    DriveBrowserController,
    GOOGLE_DRIVE_DESCRIPTOR,
    type DriveFile,
    type DriveFolder,
} from '@upup/core'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/uploader-context'

export function useGoogleDrive() {
    const { core } = useUploaderRuntime()
    const { setActiveSource } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    // core is always non-null inside <UpupUploader /> — the injection throws otherwise.
    const controller = new DriveBrowserController(core!, GOOGLE_DRIVE_DESCRIPTOR, {
        onFilesSelected: (files) => {
            setFiles(files)
        },
        onClose: () => setActiveSource(undefined),
    })

    const state = shallowRef(controller.getSnapshot())
    let unsub: (() => void) | null = null

    onMounted(() => {
        unsub = controller.subscribe(() => {
            state.value = controller.getSnapshot()
        })
        controller.init()
    })
    onUnmounted(() => {
        controller.destroy()
        unsub?.()
    })

    return {
        user: computed(() => state.value.user),
        googleFiles: computed(() => state.value.folder),
        token: computed(() => state.value.token),
        authCancelled: computed(() => state.value.authCancelled),
        isAuthReady: computed(() => state.value.isAuthReady),
        retryAuth: () => controller.retryAuth(),
        handleSignOut: async () => { controller.signOut() },
        path: computed(() => state.value.path),
        setPath: (newPath: DriveFolder[]) => controller.setPath(newPath),
        handleClick: (file: DriveFile) => controller.handleClick(file),
        selectedFiles: computed(() => state.value.selectedFiles),
        showLoader: computed(() => state.value.showLoader),
        handleSubmit: () => controller.handleSubmit(),
        handleCancelDownload: () => controller.handleCancelDownload(),
        onSelectCurrentFolder: () => controller.onSelectCurrentFolder(),
        isClickLoading: computed(() => state.value.isClickLoading),
        error: computed(() => state.value.error),
        hasMore: computed(() => state.value.hasMore),
        isLoadingMore: computed(() => state.value.isLoadingMore),
        loadMore: () => controller.loadMore(),
    }
}

export default useGoogleDrive
