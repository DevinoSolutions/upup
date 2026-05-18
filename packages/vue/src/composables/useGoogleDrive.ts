import { ref, watch, onMounted, onUnmounted } from 'vue'
import { GoogleDrivePlugin, type DriveFile, type DriveFolder, type DriveUser } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/root-context'
import useLoadGAPI from './useLoadGAPI'

type GisToken = { access_token: string; expires_in: number; error?: string }

export function useGoogleDrive() {
    const { core } = useUploaderRuntime()
    const { googleDriveConfigs, setActiveAdapter } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    const user = ref<DriveUser>()
    const googleFiles = ref<DriveFolder>()
    const token = ref<GisToken>()
    const authCancelled = ref(false)
    const isAuthReady = ref(false)
    const path = ref<DriveFolder[]>([])
    const selectedFiles = ref<DriveFile[]>([])
    const showLoader = ref(false)
    const downloadProgress = ref(0)
    const isClickLoading = ref(false)

    let plugin: GoogleDrivePlugin | null = null
    let tokenClient: { requestAccessToken: (opts?: object) => void } | null = null
    const unsubs: Array<() => void> = []

    const { gisLoaded } = useLoadGAPI()

    // ── Plugin setup + event subscriptions ──

    onMounted(() => {
        if (!core) return
        const p = core.getPlugin?.('google-drive') as GoogleDrivePlugin | undefined
        if (!p) return
        plugin = p

        // Try restoring session from sessionStorage
        const restored = p.restoreSession()
        if (restored) {
            const fakeToken: GisToken = {
                access_token: p.getAccessToken() || '',
                expires_in: 3600,
            }
            token.value = fakeToken

            void (async () => {
                try {
                    const userInfo = await p.getUserInfo()
                    if (userInfo) user.value = userInfo as DriveUser
                } catch {
                    // non-critical
                }
                await p.loadFiles()
            })()
        }

        unsubs.push(
            core.on('google-drive:authenticated', (payload: unknown) => {
                const data = payload as { user?: DriveUser }
                if (data.user) user.value = data.user
                isAuthReady.value = true
            }),
            core.on('google-drive:signed-out', () => {
                user.value = undefined
                googleFiles.value = undefined
                token.value = undefined
                path.value = []
                selectedFiles.value = []
            }),
            core.on('google-drive:session-expired', () => {
                user.value = undefined
                googleFiles.value = undefined
                token.value = undefined
                path.value = []
            }),
            core.on('google-drive:files-loaded', (payload: unknown) => {
                const data = payload as { files: DriveFile[]; folderId: string }
                const root: DriveFolder = {
                    id: data.folderId || 'root',
                    name: data.folderId === 'root' ? 'Drive' : data.folderId,
                    path: '',
                    size: 0,
                    mimeType: '',
                    isFolder: true,
                    children: data.files,
                }
                googleFiles.value = root
                isClickLoading.value = false
            }),
            core.on('google-drive:state-change', (payload: unknown) => {
                const data = payload as { state: string }
                if (data.state === 'browsing') {
                    isClickLoading.value = true
                }
            }),
            core.on('google-drive:error', () => {
                isClickLoading.value = false
                showLoader.value = false
            }),
        )
    })

    onUnmounted(() => { unsubs.forEach(u => u()) })

    // ── GIS initialization (loads Google Identity Services popup) ──

    watch(gisLoaded, (loaded) => {
        if (!loaded || !googleDriveConfigs) return
        const { google_client_id, google_api_key } = googleDriveConfigs
        if (!google_client_id || !google_api_key) {
            isAuthReady.value = true
            return
        }

        // If we already have a plugin with a valid session, skip GIS init
        if (plugin?.isAuthenticated()) {
            isAuthReady.value = true
            return
        }

        void (async () => {
            const google = await (window as any).google
            const client = google.accounts.oauth2.initTokenClient({
                client_id: google_client_id,
                scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile',
                ux_mode: 'popup',
                callback(tokenResponse: GisToken) {
                    if (!tokenResponse?.error) {
                        authCancelled.value = false
                        const newToken: GisToken = {
                            ...tokenResponse,
                            expires_in: Date.now() + (tokenResponse.expires_in - 20) * 1000,
                        }
                        token.value = newToken

                        // Delegate to plugin
                        if (plugin) {
                            void plugin.authenticate(
                                tokenResponse.access_token,
                                tokenResponse.expires_in,
                            ).then(() => plugin!.loadFiles())
                        }
                    }
                },
                error_callback(_error: { type: string; message?: string }) {
                    authCancelled.value = true
                },
            })
            tokenClient = client
            isAuthReady.value = true
        })()
    }, { immediate: true })

    // ── Actions ──

    async function handleSignOut() {
        plugin?.signOut()
        token.value = undefined
    }

    function retryAuth() {
        if (!googleDriveConfigs?.google_client_id || !googleDriveConfigs?.google_api_key) return
        authCancelled.value = false
        tokenClient?.requestAccessToken({})
    }

    function handleClick(file: DriveFile) {
        if (!plugin) return

        if (file.isFolder) {
            isClickLoading.value = true
            if (googleFiles.value) {
                path.value = [...path.value, googleFiles.value]
            }
            void plugin.loadFiles(file.id)
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
            // Error handled via plugin event
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
        if (!plugin) return

        const current = path.value[path.value.length - 1]
        if (!current) return

        showLoader.value = true
        downloadProgress.value = 0

        try {
            const fileOnly = current.children.filter(f => !f.isFolder)

            if (fileOnly.length > 0) {
                const downloaded = await plugin.downloadFiles(fileOnly)
                if (downloaded.length > 0) {
                    setFiles(downloaded)
                }
            }
            selectedFiles.value = []
            setActiveAdapter(undefined)
        } catch {
            // Error handled via plugin event
        } finally {
            showLoader.value = false
            downloadProgress.value = 0
        }
    }

    return {
        user,
        googleFiles,
        handleSignOut,
        token,
        authCancelled,
        retryAuth,
        isAuthReady,
        path,
        setPath(newPath: DriveFolder[]) { path.value = newPath },
        handleClick,
        selectedFiles,
        showLoader,
        handleSubmit,
        downloadProgress,
        handleCancelDownload,
        onSelectCurrentFolder,
        isClickLoading,
    }
}

export default useGoogleDrive
