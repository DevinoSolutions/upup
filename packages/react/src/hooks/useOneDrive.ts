import { useEffect, useRef, useSyncExternalStore, type SetStateAction } from 'react'
import {
    AdapterBrowserController,
    ONE_DRIVE_DESCRIPTOR,
    type AdapterBrowserState,
    type DriveFile,
    type DriveFolder,
} from '@upup/core'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/RootContext'

/** Stable fallback snapshot for the first render (core is created post-paint, so the
 *  controller is briefly null) and for useSyncExternalStore's server snapshot.
 *  Mirrors the AdapterBrowserController constructor defaults. */
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

export default function useOneDrive() {
    const { core } = useUploaderRuntime()
    const { setActiveAdapter } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    // One controller per mounted adapter view, created once (guarded ref) — same
    // idiom as useRootProvider's rootRef. setFiles/setActiveAdapter are referentially
    // stable (useCallback over root), so capturing them once is safe.
    const controllerRef = useRef<AdapterBrowserController | null>(null)
    if (!controllerRef.current && core) {
        controllerRef.current = new AdapterBrowserController(core, ONE_DRIVE_DESCRIPTOR, {
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

    return {
        user: state.user,
        oneDriveFiles: state.folder,
        signOut: () => controller?.signOut(),
        signIn: () => controller?.signIn(),
        authenticate: () => controller?.signIn(),
        token: state.isAuthenticated ? 'active' : undefined,
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        path: state.path,
        setPath: (value: SetStateAction<DriveFolder[]>) =>
            controller?.setPath(
                typeof value === 'function'
                    ? value(controller.getSnapshot().path)
                    : value,
            ),
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
