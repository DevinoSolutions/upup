import { onMount, onDestroy } from 'svelte'
import { derived, type Readable } from 'svelte/store'
import {
    GOOGLE_DRIVE_DESCRIPTOR,
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
import { toReadable } from '../lib/to-readable'

export interface UseGoogleDriveReturn {
    user: Readable<DriveBrowserState['user']>
    googleFiles: Readable<DriveBrowserState['folder']>
    token: Readable<DriveBrowserState['token']>
    authCancelled: Readable<DriveBrowserState['authCancelled']>
    isAuthReady: Readable<DriveBrowserState['isAuthReady']>
    retryAuth: () => void
    handleSignOut: () => Promise<void>
    path: Readable<DriveBrowserState['path']>
    setPath: (newPath: DriveFolder[]) => void
    handleClick: (file: DriveFile) => void
    selectedFiles: Readable<DriveBrowserState['selectedFiles']>
    showLoader: Readable<DriveBrowserState['showLoader']>
    handleSubmit: () => Promise<void>
    handleCancelDownload: () => void
    onSelectCurrentFolder: () => Promise<void>
    isClickLoading: Readable<DriveBrowserState['isClickLoading']>
    error: Readable<DriveBrowserState['error']>
    hasMore: Readable<DriveBrowserState['hasMore']>
    isLoadingMore: Readable<DriveBrowserState['isLoadingMore']>
    loadMore: () => Promise<void>
}

export function useGoogleDrive(): UseGoogleDriveReturn {
    const { core } = useUploaderRuntime()
    const { setActiveSource } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    // core is always non-null inside <UpupUploader /> — the injection throws otherwise.
    if (!core)
        throw new Error(
            'useGoogleDrive must be used inside an initialized <UpupUploader />',
        )

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

    const state = toReadable(controller)

    onMount(() => {
        controller.init()
    })
    onDestroy(() => {
        controller.destroy()
    })

    return {
        user: derived(state, $s => $s.user),
        googleFiles: derived(state, $s => $s.folder),
        token: derived(state, $s => $s.token),
        authCancelled: derived(state, $s => $s.authCancelled),
        isAuthReady: derived(state, $s => $s.isAuthReady),
        retryAuth: () => {
            controller.retryAuth()
        },
        // signOut is synchronous; the shared DriveBrowser prop contract is
        // `() => Promise<void>`, so resolve explicitly rather than mark async.
        handleSignOut: () => {
            controller.signOut()
            return Promise.resolve()
        },
        path: derived(state, $s => $s.path),
        setPath: (newPath: DriveFolder[]) => {
            controller.setPath(newPath)
        },
        handleClick: (file: DriveFile) => {
            controller.handleClick(file)
        },
        selectedFiles: derived(state, $s => $s.selectedFiles),
        showLoader: derived(state, $s => $s.showLoader),
        handleSubmit: () => controller.handleSubmit(),
        handleCancelDownload: () => {
            controller.handleCancelDownload()
        },
        onSelectCurrentFolder: () => controller.onSelectCurrentFolder(),
        isClickLoading: derived(state, $s => $s.isClickLoading),
        error: derived(state, $s => $s.error),
        hasMore: derived(state, $s => $s.hasMore),
        isLoadingMore: derived(state, $s => $s.isLoadingMore),
        loadMore: () => controller.loadMore(),
    }
}

export default useGoogleDrive
