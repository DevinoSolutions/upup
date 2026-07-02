import { onMount, onDestroy } from 'svelte'
import { derived } from 'svelte/store'
import {
    DriveBrowserController,
    BOX_DESCRIPTOR,
    type DriveFile,
    type DriveFolder,
} from '@upup/core'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/uploader-context'
import { toReadable } from '../lib/to-readable'

export function useBox() {
    const { core } = useUploaderRuntime()
    const { setActiveAdapter } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    const controller = new DriveBrowserController(core!, BOX_DESCRIPTOR, {
        onFilesSelected: (files) => {
            setFiles(files)
        },
        onClose: () => setActiveAdapter(undefined),
    })

    const state = toReadable(controller)

    onMount(() => controller.init())
    onDestroy(() => controller.destroy())

    return {
        user: derived(state, ($s) => $s.user),
        boxFiles: derived(state, ($s) => $s.folder),
        logout: () => controller.signOut(),
        authenticate: () => controller.signIn(),
        token: derived(state, ($s) => ($s.isAuthenticated ? 'active' : undefined)),
        isAuthenticated: derived(state, ($s) => $s.isAuthenticated),
        isLoading: derived(state, ($s) => $s.isLoading),
        path: derived(state, ($s) => $s.path),
        setPath: (newPath: DriveFolder[]) => controller.setPath(newPath),
        handleClick: (file: DriveFile) => controller.handleClick(file),
        selectedFiles: derived(state, ($s) => $s.selectedFiles),
        showLoader: derived(state, ($s) => $s.showLoader),
        handleSubmit: () => controller.handleSubmit(),
        downloadProgress: derived(state, ($s) => $s.downloadProgress),
        handleCancelDownload: () => controller.handleCancelDownload(),
        onSelectCurrentFolder: () => controller.onSelectCurrentFolder(),
        isClickLoading: derived(state, ($s) => $s.isClickLoading),
    }
}

export default useBox
