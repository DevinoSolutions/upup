import {
    shallowRef,
    computed,
    onMounted,
    onUnmounted,
    type ComputedRef,
} from 'vue'
import {
    GOOGLE_DRIVE_DESCRIPTOR,
    type DriveFile,
    type DriveFolder,
} from '@upup/core'
import {
    DriveBrowserController,
    type DriveBrowserState,
} from '@upup/core/internal'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/uploader-context'

interface UseGoogleDriveReturn {
    user: ComputedRef<DriveBrowserState['user']>
    googleFiles: ComputedRef<DriveBrowserState['folder']>
    token: ComputedRef<DriveBrowserState['token']>
    authCancelled: ComputedRef<DriveBrowserState['authCancelled']>
    isAuthReady: ComputedRef<DriveBrowserState['isAuthReady']>
    retryAuth: () => void
    handleSignOut: () => Promise<void>
    path: ComputedRef<DriveBrowserState['path']>
    setPath: (newPath: DriveFolder[]) => void
    handleClick: (file: DriveFile) => void
    selectedFiles: ComputedRef<DriveBrowserState['selectedFiles']>
    showLoader: ComputedRef<DriveBrowserState['showLoader']>
    handleSubmit: () => Promise<void>
    handleCancelDownload: () => void
    onSelectCurrentFolder: () => Promise<void>
    isClickLoading: ComputedRef<DriveBrowserState['isClickLoading']>
    error: ComputedRef<DriveBrowserState['error']>
    hasMore: ComputedRef<DriveBrowserState['hasMore']>
    isLoadingMore: ComputedRef<DriveBrowserState['isLoadingMore']>
    loadMore: () => Promise<void>
}

export function useGoogleDrive(): UseGoogleDriveReturn {
    const { core } = useUploaderRuntime()
    const { setActiveSource } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    if (!core) {
        throw new Error('useGoogleDrive must be used inside <UpupUploader />')
    }

    const controller = new DriveBrowserController(
        core,
        GOOGLE_DRIVE_DESCRIPTOR,
        {
            onFilesSelected: files => {
                setFiles(files)
            },
            onClose: () => {
                setActiveSource(undefined)
            },
        },
    )

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
        retryAuth: () => {
            controller.retryAuth()
        },
        // Returns a resolved promise (not async) to satisfy the DriveBrowser
        // `handleSignOut: () => Promise<void>` prop contract; signOut is sync.
        handleSignOut: () => {
            controller.signOut()
            return Promise.resolve()
        },
        path: computed(() => state.value.path),
        setPath: (newPath: DriveFolder[]) => {
            controller.setPath(newPath)
        },
        handleClick: (file: DriveFile) => {
            controller.handleClick(file)
        },
        selectedFiles: computed(() => state.value.selectedFiles),
        showLoader: computed(() => state.value.showLoader),
        handleSubmit: () => controller.handleSubmit(),
        handleCancelDownload: () => {
            controller.handleCancelDownload()
        },
        onSelectCurrentFolder: () => controller.onSelectCurrentFolder(),
        isClickLoading: computed(() => state.value.isClickLoading),
        error: computed(() => state.value.error),
        hasMore: computed(() => state.value.hasMore),
        isLoadingMore: computed(() => state.value.isLoadingMore),
        loadMore: () => controller.loadMore(),
    }
}

export default useGoogleDrive
