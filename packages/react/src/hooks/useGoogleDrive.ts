import {
    useCallback,
    useEffect,
    useRef,
    useSyncExternalStore,
    type SetStateAction,
} from 'react'
import {
    DriveBrowserController,
    GOOGLE_DRIVE_DESCRIPTOR,
    type DriveBrowserState,
    type DriveFile,
    type DriveFolder,
} from '@upup/core'
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
    downloadProgress: 0,
    isAuthReady: false,
    isAuthenticated: false,
    isLoading: true,
    authCancelled: false,
    token: undefined,
}

export function useGoogleDrive() {
    const { core } = useUploaderRuntime()
    const { setActiveSource } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    // GIS config (client id / api key) + GIS script loading are sourced inside the
    // controller (plugin.getConfig() + core loadGoogleIdentityServices), so the hook
    // no longer reads the drive config from context or uses useLoadGAPI.
    const controllerRef = useRef<DriveBrowserController | null>(null)
    if (!controllerRef.current && core) {
        controllerRef.current = new DriveBrowserController(
            core,
            GOOGLE_DRIVE_DESCRIPTOR,
            {
                onFilesSelected: files => setFiles(files),
                onClose: () => setActiveSource(undefined),
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
        googleFiles: state.folder,
        handleSignOut: async () => {
            controller?.signOut()
        },
        token: state.token,
        authCancelled: state.authCancelled,
        // GoogleDrive has no separate signIn: initial consent AND retry both go
        // through retryAuth (it resets authCancelled, then requests a GIS token).
        retryAuth: () => controller?.retryAuth(),
        isAuthReady: state.isAuthReady,
        path: state.path,
        setPath,
        handleClick: (file: DriveFile) => controller?.handleClick(file),
        selectedFiles: state.selectedFiles,
        showLoader: state.showLoader,
        handleSubmit: () => controller?.handleSubmit() ?? Promise.resolve(),
        downloadProgress: state.downloadProgress,
        handleCancelDownload: () => {
            controller?.handleCancelDownload()
        },
        onSelectCurrentFolder: () =>
            controller?.onSelectCurrentFolder() ?? Promise.resolve(),
        isClickLoading: state.isClickLoading,
    }
}

export default useGoogleDrive
