import { useCallback, useEffect, useRef, useSyncExternalStore, type SetStateAction } from 'react'
import {
    AdapterBrowserController,
    GOOGLE_DRIVE_DESCRIPTOR,
    type AdapterBrowserState,
    type DriveFile,
    type DriveFolder,
} from '@upup/core'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/RootContext'

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

export function useGoogleDrive() {
    const { core } = useUploaderRuntime()
    const { setActiveAdapter } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    // GIS config (client id / api key) + GIS script loading are sourced inside the
    // controller (plugin.getConfig() + core loadGoogleIdentityServices), so the hook
    // no longer reads googleDriveConfigs from context or uses useLoadGAPI.
    const controllerRef = useRef<AdapterBrowserController | null>(null)
    if (!controllerRef.current && core) {
        controllerRef.current = new AdapterBrowserController(core, GOOGLE_DRIVE_DESCRIPTOR, {
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

    // setPath is consumed as a useEffect dependency in DriveBrowser
    // (DriveBrowser.tsx: `useEffect(..., [driveFiles, setPath])`), so it MUST be
    // referentially stable across renders — otherwise the effect re-runs every
    // render and loops. Same reason useRootProvider useCallbacks its setters.
    // Resolves a functional updater against the live snapshot before delegating to
    // the array-only controller.setPath.
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
        retryAuth: () => controller?.retryAuth(),
        isAuthReady: state.isAuthReady,
        path: state.path,
        setPath,
        handleClick: (file: DriveFile) => controller?.handleClick(file),
        selectedFiles: state.selectedFiles,
        showLoader: state.showLoader,
        handleSubmit: () => controller?.handleSubmit() ?? Promise.resolve(),
        downloadProgress: state.downloadProgress,
        handleCancelDownload: () => { controller?.handleCancelDownload() },
        onSelectCurrentFolder: () => controller?.onSelectCurrentFolder() ?? Promise.resolve(),
        isClickLoading: state.isClickLoading,
    }
}

export default useGoogleDrive
