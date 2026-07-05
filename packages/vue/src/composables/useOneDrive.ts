import { shallowRef, computed, onMounted, onUnmounted } from 'vue'
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
        oneDriveFiles: computed(() => state.value.folder),
        signOut: () => controller.signOut(),
        signIn: () => controller.signIn(),
        authenticate: () => controller.signIn(),
        token: computed(() =>
            state.value.isAuthenticated ? 'active' : undefined,
        ),
        isAuthenticated: computed(() => state.value.isAuthenticated),
        isLoading: computed(() => state.value.isLoading),
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

export default useOneDrive
