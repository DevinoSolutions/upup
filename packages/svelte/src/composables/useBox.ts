import { onMount, onDestroy } from 'svelte'
import { derived, type Readable } from 'svelte/store'
import { BOX_DESCRIPTOR, type DriveFile, type DriveFolder } from '@upup/core'
import {
    DriveBrowserController,
    type DriveBrowserState,
} from '@upup/core/internal'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/uploader-context'
import { toReadable } from '../lib/to-readable'

export interface UseBoxReturn {
    user: Readable<DriveBrowserState['user']>
    boxFiles: Readable<DriveBrowserState['folder']>
    logout: () => void
    authenticate: () => void
    token: Readable<'active' | undefined>
    isAuthenticated: Readable<DriveBrowserState['isAuthenticated']>
    isLoading: Readable<DriveBrowserState['isLoading']>
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

export function useBox(): UseBoxReturn {
    const { core } = useUploaderRuntime()
    const { setActiveSource } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    if (!core)
        throw new Error(
            'useBox must be used inside an initialized <UpupUploader />',
        )

    const controller = new DriveBrowserController(core, BOX_DESCRIPTOR, {
        onFilesSelected: files => {
            setFiles(files)
        },
        onClose: () => {
            setActiveSource(undefined)
        },
    })

    const state = toReadable(controller)

    onMount(() => {
        controller.init()
    })
    onDestroy(() => {
        controller.destroy()
    })

    return {
        user: derived(state, $s => $s.user),
        boxFiles: derived(state, $s => $s.folder),
        logout: () => {
            controller.signOut()
        },
        authenticate: () => {
            controller.signIn()
        },
        token: derived(state, $s =>
            $s.isAuthenticated ? 'active' : undefined,
        ),
        isAuthenticated: derived(state, $s => $s.isAuthenticated),
        isLoading: derived(state, $s => $s.isLoading),
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

export default useBox
