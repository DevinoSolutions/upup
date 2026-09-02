import {
    shallowRef,
    computed,
    onMounted,
    onUnmounted,
    type ComputedRef,
} from 'vue'
import {
    ONE_DRIVE_DESCRIPTOR,
    type DriveFile,
    type DriveFolder,
} from '@useupup/core'
import {
    DriveBrowserController,
    type DriveBrowserState,
} from '@useupup/core/internal'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/uploader-context'

interface UseOneDriveReturn {
    user: ComputedRef<DriveBrowserState['user']>
    oneDriveFiles: ComputedRef<DriveBrowserState['folder']>
    signOut: () => void
    signIn: () => void
    authenticate: () => void
    token: ComputedRef<'active' | undefined>
    isAuthenticated: ComputedRef<DriveBrowserState['isAuthenticated']>
    isLoading: ComputedRef<DriveBrowserState['isLoading']>
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

export function useOneDrive(): UseOneDriveReturn {
    const { core } = useUploaderRuntime()
    const { setActiveSource } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    if (!core) {
        throw new Error('useOneDrive must be used inside <UpupUploader />')
    }

    const controller = new DriveBrowserController(core, ONE_DRIVE_DESCRIPTOR, {
        onFilesSelected: files => {
            setFiles(files)
        },
        onClose: () => {
            setActiveSource(undefined)
        },
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
        signOut: () => {
            controller.signOut()
        },
        signIn: () => {
            controller.signIn()
        },
        authenticate: () => {
            controller.signIn()
        },
        token: computed(() =>
            state.value.isAuthenticated ? 'active' : undefined,
        ),
        isAuthenticated: computed(() => state.value.isAuthenticated),
        isLoading: computed(() => state.value.isLoading),
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

export default useOneDrive
