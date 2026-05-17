import { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleDrivePlugin, type DriveFile, type DriveFolder, type DriveUser } from '@upup/core'

type GisToken = { access_token: string; expires_in: number; error?: string }
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/RootContext'
import useLoadGAPI from './useLoadGAPI'

export function useGoogleDrive() {
    const { core } = useUploaderRuntime()
    const { googleDriveConfigs, setActiveAdapter } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    const [user, setUser] = useState<DriveUser>()
    const [googleFiles, setGoogleFiles] = useState<DriveFolder>()
    const [token, setToken] = useState<GisToken>()
    const [authCancelled, setAuthCancelled] = useState(false)
    const [isAuthReady, setIsAuthReady] = useState(false)
    const [path, setPath] = useState<DriveFolder[]>([])
    const [selectedFiles, setSelectedFiles] = useState<DriveFile[]>([])
    const [showLoader, setShowLoader] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const [isClickLoading, setIsClickLoading] = useState(false)

    const pluginRef = useRef<GoogleDrivePlugin | null>(null)
    const tokenClientRef = useRef<{
        requestAccessToken: (opts?: object) => void
    } | null>(null)

    const { gisLoaded } = useLoadGAPI()

    // ── Plugin setup + event subscriptions ──

    useEffect(() => {
        if (!core) return
        const plugin = core.getPlugin?.('google-drive') as GoogleDrivePlugin | undefined
        if (!plugin) return
        pluginRef.current = plugin

        // Try restoring session from sessionStorage
        const restored = plugin.restoreSession()
        if (restored) {
            const fakeToken: GisToken = {
                access_token: plugin.getAccessToken() || '',
                expires_in: 3600,
            }
            setToken(fakeToken)

            void (async () => {
                try {
                    const userInfo = await plugin.getUserInfo()
                    if (userInfo) setUser(userInfo as DriveUser)
                } catch {
                    // non-critical
                }
                await plugin.loadFiles()
            })()
        }

        const unsubs = [
            core.on('google-drive:authenticated', (payload: unknown) => {
                const data = payload as { user?: DriveUser }
                if (data.user) setUser(data.user)
                setIsAuthReady(true)
            }),
            core.on('google-drive:signed-out', () => {
                setUser(undefined)
                setGoogleFiles(undefined)
                setToken(undefined)
                setPath([])
                setSelectedFiles([])
            }),
            core.on('google-drive:session-expired', () => {
                setUser(undefined)
                setGoogleFiles(undefined)
                setToken(undefined)
                setPath([])
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
                setGoogleFiles(root)
                setIsClickLoading(false)
            }),
            core.on('google-drive:state-change', (payload: unknown) => {
                const data = payload as { state: string }
                if (data.state === 'browsing') {
                    setIsClickLoading(true)
                }
            }),
            core.on('google-drive:error', () => {
                setIsClickLoading(false)
                setShowLoader(false)
            }),
        ]

        return () => { unsubs.forEach(u => u()) }
    }, [core])

    // ── GIS initialization (loads Google Identity Services popup) ──

    useEffect(() => {
        if (!gisLoaded || !googleDriveConfigs) return
        const { google_client_id, google_api_key } = googleDriveConfigs
        if (!google_client_id || !google_api_key) {
            setIsAuthReady(true)
            return
        }

        // If we already have a plugin with a valid session, skip GIS init
        if (pluginRef.current?.isAuthenticated()) {
            setIsAuthReady(true)
            return
        }

        void (async () => {
            const google = await window.google
            const client = google.accounts.oauth2.initTokenClient({
                client_id: google_client_id,
                scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile',
                ux_mode: 'popup',
                callback(tokenResponse: GisToken) {
                    if (!tokenResponse?.error) {
                        setAuthCancelled(false)
                        const newToken: GisToken = {
                            ...tokenResponse,
                            expires_in: Date.now() + (tokenResponse.expires_in - 20) * 1000,
                        }
                        setToken(newToken)

                        // Delegate to plugin
                        const plugin = pluginRef.current
                        if (plugin) {
                            void plugin.authenticate(
                                tokenResponse.access_token,
                                tokenResponse.expires_in,
                            ).then(() => plugin.loadFiles())
                        }
                    }
                },
                error_callback(_error: { type: string; message?: string }) {
                    setAuthCancelled(true)
                },
            })
            tokenClientRef.current = client
            setIsAuthReady(true)
        })()
    }, [gisLoaded, googleDriveConfigs])

    // ── Actions ──

    const handleSignOut = useCallback(async () => {
        pluginRef.current?.signOut()
        setToken(undefined)
    }, [])

    const retryAuth = useCallback(() => {
        if (!googleDriveConfigs?.google_client_id || !googleDriveConfigs?.google_api_key) return
        setAuthCancelled(false)
        tokenClientRef.current?.requestAccessToken({})
    }, [googleDriveConfigs])

    const handleClick = useCallback((file: DriveFile) => {
        const plugin = pluginRef.current
        if (!plugin) return

        if (file.isFolder) {
            setIsClickLoading(true)
            if (googleFiles) {
                setPath(prev => [...prev, googleFiles])
            }
            void plugin.loadFiles(file.id)
        } else {
            setSelectedFiles(prev =>
                prev.some(f => f.id === file.id)
                    ? prev.filter(f => f.id !== file.id)
                    : [...prev, file],
            )
        }
    }, [googleFiles])

    const handleSubmit = useCallback(async () => {
        const plugin = pluginRef.current
        if (!plugin || selectedFiles.length === 0) return

        setShowLoader(true)
        setDownloadProgress(0)

        try {
            const downloaded = await plugin.downloadFiles(selectedFiles)
            if (downloaded.length > 0) {
                setFiles(downloaded)
            }
            setSelectedFiles([])
            setActiveAdapter(undefined)
        } catch {
            // Error handled via plugin event
        } finally {
            setShowLoader(false)
            setDownloadProgress(0)
        }
    }, [selectedFiles, setFiles, setActiveAdapter])

    const handleCancelDownload = useCallback(() => {
        setSelectedFiles([])
        setDownloadProgress(0)
    }, [])

    const onSelectCurrentFolder = useCallback(async () => {
        const plugin = pluginRef.current
        if (!plugin) return

        const current = path[path.length - 1]
        if (!current) return

        setShowLoader(true)
        setDownloadProgress(0)

        try {
            const fileOnly = current.children.filter(f => !f.isFolder)

            if (fileOnly.length > 0) {
                const downloaded = await plugin.downloadFiles(fileOnly)
                if (downloaded.length > 0) {
                    setFiles(downloaded)
                }
            }
            setSelectedFiles([])
            setActiveAdapter(undefined)
        } catch {
            // Error handled via plugin event
        } finally {
            setShowLoader(false)
            setDownloadProgress(0)
        }
    }, [path, setFiles, setActiveAdapter])

    return {
        // From old useGoogleDrive
        user,
        googleFiles,
        handleSignOut,
        token,
        authCancelled,
        retryAuth,
        isAuthReady,
        // From old useGoogleDriveUploader
        path,
        setPath,
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
