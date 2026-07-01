import { useCallback, useEffect, useRef, useSyncExternalStore, type SetStateAction } from 'react'
import {
    AdapterBrowserController,
    DROPBOX_DESCRIPTOR,
    type AdapterBrowserState,
    type DriveFile,
    type DriveFolder,
} from '@upup/core'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/UploaderContext'

/** Stable fallback snapshot — mirrors AdapterBrowserController constructor defaults. */
const SERVER_SNAPSHOT: AdapterBrowserState = {
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

export function useDropbox() {
    const { core } = useUploaderRuntime()
    const { setActiveAdapter } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    // One controller per mounted adapter view, created once (guarded ref) — same
    // idiom as useRootProvider's rootRef. setFiles/setActiveAdapter are referentially
    // stable (useCallback over root), so capturing them once is safe.
    const controllerRef = useRef<AdapterBrowserController | null>(null)
    if (!controllerRef.current && core) {
        controllerRef.current = new AdapterBrowserController(core, DROPBOX_DESCRIPTOR, {
            onFilesSelected: files => setFiles(files),
            onClose: () => setActiveAdapter(undefined),
        })
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
    // (same reason useRootProvider useCallbacks its setters) and resolves that
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
        downloadProgress: state.downloadProgress,
        handleCancelDownload: () => { controller?.handleCancelDownload() },
        onSelectCurrentFolder: () => controller?.onSelectCurrentFolder() ?? Promise.resolve(),
    }
}
