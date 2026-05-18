import { ref, onMounted, onUnmounted } from 'vue'
import { DropboxPlugin, bindAdapterEvents, type DriveFile, type DriveFolder, type DriveUser } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/root-context'

export function useDropbox() {
    const { core } = useUploaderRuntime()
    const { dropboxConfigs, setActiveAdapter } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    const user = ref<DriveUser>()
    const dropboxFiles = ref<DriveFolder>()
    const isAuthenticated = ref(false)
    const isLoading = ref(true)
    const path = ref<DriveFolder[]>([])
    const selectedFiles = ref<DriveFile[]>([])
    const showLoader = ref(false)
    const downloadProgress = ref(0)
    const isClickLoading = ref(false)

    let plugin: DropboxPlugin | null = null
    let cleanup: (() => void) | null = null

    onMounted(() => {
        if (!core) return
        const p = core.getPlugin?.('dropbox') as DropboxPlugin | undefined
        if (!p) return
        plugin = p

        const restored = p.restoreSession()
        isAuthenticated.value = restored
        isLoading.value = false

        if (restored) {
            void (async () => {
                const userInfo = await p.getUserInfo()
                if (userInfo) user.value = userInfo
                await p.loadFiles('')
            })()
        }

        cleanup = bindAdapterEvents(core, 'dropbox', {
            onAuthenticated: (payload: unknown) => {
                const data = payload as { user?: DriveUser }
                if (data.user) user.value = data.user
                isAuthenticated.value = true
                isLoading.value = false
            },
            onSignedOut: () => {
                user.value = undefined
                dropboxFiles.value = undefined
                isAuthenticated.value = false
                path.value = []
                selectedFiles.value = []
            },
            onSessionExpired: () => {
                user.value = undefined
                dropboxFiles.value = undefined
                isAuthenticated.value = false
                path.value = []
            },
            onFilesLoaded: (payload: unknown) => {
                const data = payload as { files: DriveFile[]; path: string }
                const root: DriveFolder = {
                    id: data.path || 'root',
                    name: data.path ? data.path.split('/').pop() || 'Dropbox' : 'Dropbox',
                    path: data.path || '',
                    size: 0,
                    mimeType: '',
                    isFolder: true,
                    children: data.files,
                }
                dropboxFiles.value = root
                isClickLoading.value = false
            },
            onStateChange: (payload: unknown) => {
                const data = payload as { state: string }
                isLoading.value = data.state === 'authenticating' || data.state === 'browsing'
            },
            onError: () => {
                isClickLoading.value = false
                showLoader.value = false
            },
        })
    })

    onUnmounted(() => { cleanup?.() })

    async function authenticate() {
        if (!plugin) return
        isLoading.value = true
        await plugin.authenticateViaPopup()
        if (plugin.isAuthenticated()) {
            await plugin.loadFiles('')
        }
    }

    function logout() {
        plugin?.signOut()
    }

    async function handleClick(file: DriveFile) {
        if (!plugin) return

        if (file.isFolder) {
            isClickLoading.value = true
            if (dropboxFiles.value) {
                path.value = [...path.value, dropboxFiles.value]
            }
            await plugin.loadFiles(file.path)
        } else {
            const prev = selectedFiles.value
            selectedFiles.value = prev.some(f => f.id === file.id)
                ? prev.filter(f => f.id !== file.id)
                : [...prev, file]
        }
    }

    async function handleSubmit() {
        if (!plugin || selectedFiles.value.length === 0) return

        showLoader.value = true
        downloadProgress.value = 0

        try {
            const downloaded = await plugin.downloadFiles(selectedFiles.value)
            if (downloaded.length > 0) {
                setFiles(downloaded)
            }
            selectedFiles.value = []
            setActiveAdapter(undefined)
        } catch {
            // Error handled via event
        } finally {
            showLoader.value = false
            downloadProgress.value = 0
        }
    }

    function handleCancelDownload() {
        selectedFiles.value = []
        downloadProgress.value = 0
    }

    async function onSelectCurrentFolder() {
        if (!plugin || !dropboxFiles.value) return

        showLoader.value = true
        downloadProgress.value = 0

        try {
            const currentPath = dropboxFiles.value.path || ''
            const allFiles = await plugin.loadAllFilesInFolder(currentPath)
            const fileOnly = allFiles.filter(f => !f.isFolder)
            if (fileOnly.length > 0) {
                const downloaded = await plugin.downloadFiles(fileOnly)
                if (downloaded.length > 0) {
                    setFiles(downloaded)
                }
            }
            selectedFiles.value = []
            setActiveAdapter(undefined)
        } catch {
            // Error handled via event
        } finally {
            showLoader.value = false
            downloadProgress.value = 0
        }
    }

    return {
        user,
        dropboxFiles,
        logout,
        authenticate,
        token: isAuthenticated,
        isAuthenticated,
        isLoading,
        path,
        setPath(newPath: DriveFolder[]) { path.value = newPath },
        isClickLoading,
        handleClick,
        selectedFiles,
        showLoader,
        handleSubmit,
        downloadProgress,
        handleCancelDownload,
        onSelectCurrentFolder,
    }
}
