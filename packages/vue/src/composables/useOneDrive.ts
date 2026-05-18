import { ref, onMounted, onUnmounted } from 'vue'
import { OneDrivePlugin, bindAdapterEvents, type DriveFile, type DriveFolder, type DriveUser } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/root-context'

export function useOneDrive() {
    const { core } = useUploaderRuntime()
    const { oneDriveConfigs, setActiveAdapter } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    const user = ref<DriveUser>()
    const oneDriveFiles = ref<DriveFolder>()
    const isAuthenticated = ref(false)
    const isLoading = ref(true)
    const path = ref<DriveFolder[]>([])
    const selectedFiles = ref<DriveFile[]>([])
    const showLoader = ref(false)
    const downloadProgress = ref(0)
    const isClickLoading = ref(false)

    let plugin: OneDrivePlugin | null = null
    let cleanup: (() => void) | null = null

    onMounted(() => {
        if (!core) return
        const p = core.getPlugin?.('one-drive') as OneDrivePlugin | undefined
        if (!p) return
        plugin = p

        const restored = p.restoreSession()
        isAuthenticated.value = restored
        isLoading.value = false

        if (restored) {
            void (async () => {
                try {
                    const userInfo = await p.getUserInfo()
                    if (userInfo) user.value = userInfo
                } catch {
                    // Profile fetch is non-critical
                }
                await p.loadFiles()
            })()
        }

        cleanup = bindAdapterEvents(core, 'onedrive', {
            onAuthenticated: (payload: unknown) => {
                const data = payload as { user?: DriveUser }
                if (data.user) user.value = data.user
                isAuthenticated.value = true
                isLoading.value = false
            },
            onSignedOut: () => {
                user.value = undefined
                oneDriveFiles.value = undefined
                isAuthenticated.value = false
                path.value = []
                selectedFiles.value = []
            },
            onSessionExpired: () => {
                user.value = undefined
                oneDriveFiles.value = undefined
                isAuthenticated.value = false
                path.value = []
            },
            onFilesLoaded: (payload: unknown) => {
                const data = payload as { files: DriveFile[]; folderId: string }
                const root: DriveFolder = {
                    id: data.folderId || 'root',
                    name: data.folderId === 'root' || !data.folderId ? 'OneDrive' : data.folderId,
                    path: '',
                    size: 0,
                    mimeType: '',
                    isFolder: true,
                    children: data.files,
                }
                oneDriveFiles.value = root
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
            await plugin.loadFiles()
        }
    }

    function signOut() {
        plugin?.signOut()
    }

    async function handleClick(file: DriveFile) {
        if (!plugin) return

        if (file.isFolder) {
            isClickLoading.value = true
            if (oneDriveFiles.value) {
                path.value = [...path.value, oneDriveFiles.value]
            }
            await plugin.loadFiles(file.id)
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
        if (!plugin || !oneDriveFiles.value) return

        showLoader.value = true
        downloadProgress.value = 0

        try {
            const folderId = oneDriveFiles.value.id || 'root'
            const allFiles = await plugin.loadAllFilesInFolder(folderId)
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
        oneDriveFiles,
        signOut,
        signIn: authenticate,
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
