import { shallowRef, computed, onMounted, onUnmounted } from 'vue'
import {
    AdapterBrowserController,
    ONE_DRIVE_DESCRIPTOR,
    type DriveFile,
    type DriveFolder,
} from '@upup/core'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/root-context'

export function useOneDrive() {
    const { core } = useUploaderRuntime()
    const { setActiveAdapter } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    const controller = new AdapterBrowserController(core!, ONE_DRIVE_DESCRIPTOR, {
        onFilesSelected: (files) => {
            setFiles(files)
        },
        onClose: () => setActiveAdapter(undefined),
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
        token: computed(() => (state.value.isAuthenticated ? 'active' : undefined)),
        isAuthenticated: computed(() => state.value.isAuthenticated),
        isLoading: computed(() => state.value.isLoading),
        path: computed(() => state.value.path),
        setPath: (newPath: DriveFolder[]) => controller.setPath(newPath),
        handleClick: (file: DriveFile) => controller.handleClick(file),
        selectedFiles: computed(() => state.value.selectedFiles),
        showLoader: computed(() => state.value.showLoader),
        handleSubmit: () => controller.handleSubmit(),
        downloadProgress: computed(() => state.value.downloadProgress),
        handleCancelDownload: () => controller.handleCancelDownload(),
        onSelectCurrentFolder: () => controller.onSelectCurrentFolder(),
        isClickLoading: computed(() => state.value.isClickLoading),
    }
}

export default useOneDrive
