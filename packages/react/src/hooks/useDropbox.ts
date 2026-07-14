import {
    useCallback,
    useEffect,
    useRef,
    useSyncExternalStore,
    type SetStateAction,
} from 'react'
import {
    DROPBOX_DESCRIPTOR,
    type DriveFile,
    type DriveFolder,
} from '@upupjs/core'
import {
    DriveBrowserController,
    type DriveBrowserState,
} from '@upupjs/core/internal'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/UploaderContext'

/** Stable fallback snapshot — mirrors DriveBrowserController constructor defaults. */
const SERVER_SNAPSHOT: DriveBrowserState = {
    user: undefined,
    folder: undefined,
    path: [],
    selectedFiles: [],
    isClickLoading: false,
    showLoader: false,
    isAuthReady: false,
    isAuthenticated: false,
    isLoading: true,
    authCancelled: false,
    token: undefined,
    error: undefined,
    hasMore: false,
    isLoadingMore: false,
}

export interface UseDropboxResult {
    user: DriveBrowserState['user']
    dropboxFiles: DriveBrowserState['folder']
    logout: () => void
    authenticate: () => void
    token: string | undefined
    isAuthenticated: boolean
    isLoading: boolean
    path: DriveFolder[]
    setPath: (value: SetStateAction<DriveFolder[]>) => void
    isClickLoading: boolean
    handleClick: (file: DriveFile) => void
    selectedFiles: DriveFile[]
    showLoader: boolean
    handleSubmit: () => Promise<void>
    handleCancelDownload: () => void
    onSelectCurrentFolder: () => Promise<void>
    error: DriveBrowserState['error']
    hasMore: boolean
    isLoadingMore: boolean
    loadMore: () => Promise<void>
}

export function useDropbox(): UseDropboxResult {
    const { core } = useUploaderRuntime()
    const { setActiveSource } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    // One controller per mounted adapter view, created once (guarded ref) — same
    // idiom as useUploaderController's rootRef. setFiles/setActiveSource are referentially
    // stable (useCallback over root), so capturing them once is safe.
    const controllerRef = useRef<DriveBrowserController | null>(null)
    if (!controllerRef.current && core) {
        controllerRef.current = new DriveBrowserController(
            core,
            DROPBOX_DESCRIPTOR,
            {
                onFilesSelected: files => {
                    setFiles(files)
                },
                onClose: () => {
                    setActiveSource(undefined)
                },
            },
        )
    }
    const controller = controllerRef.current

    useEffect(() => {
        controller?.init()
        return () => controller?.destroy()
    }, [controller])

    const state = useSyncExternalStore(
        controller?.subscribe ?? (() => () => {}),
        controller?.getSnapshot ?? (() => SERVER_SNAPSHOT),
        () => SERVER_SNAPSHOT,
    )

    // setPath is passed as a prop to DriveBrowser/DriveBrowserHeader, where the
    // breadcrumb truncates the trail by calling it with a functional updater
    // (`prev => prev.slice(0, i+1)`). It MUST be referentially stable across renders
    // (same reason useUploaderController useCallbacks its setters) and resolves that
    // updater against the live snapshot before delegating to the array-only
    // controller.setPath.
    const setPath = useCallback(
        (value: SetStateAction<DriveFolder[]>) =>
            controller?.setPath(
                typeof value === 'function'
                    ? value(controller.getSnapshot().path)
                    : value,
            ),
        [controller],
    )

    return {
        user: state.user,
        dropboxFiles: state.folder,
        logout: () => controller?.signOut(),
        authenticate: () => controller?.signIn(),
        // 'active' is a presence sentinel the component checks via `!token`; the real
        // token lives in state.token and is intentionally not surfaced here.
        token: state.isAuthenticated ? 'active' : undefined,
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        path: state.path,
        setPath,
        isClickLoading: state.isClickLoading,
        handleClick: (file: DriveFile) => controller?.handleClick(file),
        selectedFiles: state.selectedFiles,
        showLoader: state.showLoader,
        handleSubmit: () => controller?.handleSubmit() ?? Promise.resolve(),
        handleCancelDownload: () => {
            controller?.handleCancelDownload()
        },
        onSelectCurrentFolder: () =>
            controller?.onSelectCurrentFolder() ?? Promise.resolve(),
        error: state.error,
        hasMore: state.hasMore,
        isLoadingMore: state.isLoadingMore,
        loadMore: () => controller?.loadMore() ?? Promise.resolve(),
    }
}
