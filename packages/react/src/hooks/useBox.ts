import { useCallback, useEffect, useRef, useState } from 'react'
import { bindAdapterEvents, BoxPlugin, type DriveFile, type DriveFolder, type DriveUser } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/RootContext'

export function useBox() {
    const { core } = useUploaderRuntime()
    const { boxConfigs, setActiveAdapter } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    const [user, setUser] = useState<DriveUser>()
    const [boxFiles, setBoxFiles] = useState<DriveFolder>()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [path, setPath] = useState<DriveFolder[]>([])
    const [selectedFiles, setSelectedFiles] = useState<DriveFile[]>([])
    const [showLoader, setShowLoader] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const [isClickLoading, setIsClickLoading] = useState(false)

    const pluginRef = useRef<BoxPlugin | null>(null)

    useEffect(() => {
        if (!core) return
        const plugin = core.getPlugin?.('box') as BoxPlugin | undefined
        if (!plugin) return
        pluginRef.current = plugin

        const restored = plugin.restoreSession()
        setIsAuthenticated(restored)
        setIsLoading(false)

        if (restored) {
            void (async () => {
                const userInfo = await plugin.getUserInfo()
                if (userInfo) setUser(userInfo)
                await plugin.loadFiles('0')
            })()
        }

        const cleanup = bindAdapterEvents(core, 'box', {
            onAuthenticated: (payload: unknown) => {
                const data = payload as { user?: DriveUser }
                if (data.user) setUser(data.user)
                setIsAuthenticated(true)
                setIsLoading(false)
            },
            onSignedOut: () => {
                setUser(undefined)
                setBoxFiles(undefined)
                setIsAuthenticated(false)
                setPath([])
                setSelectedFiles([])
            },
            onSessionExpired: () => {
                setUser(undefined)
                setBoxFiles(undefined)
                setIsAuthenticated(false)
                setPath([])
            },
            onFilesLoaded: (payload: unknown) => {
                const data = payload as { files: DriveFile[]; folderId: string }
                const root: DriveFolder = {
                    id: data.folderId || '0',
                    name: data.folderId === '0' || !data.folderId ? 'Box' : data.folderId,
                    path: '',
                    size: 0,
                    mimeType: '',
                    isFolder: true,
                    children: data.files,
                }
                setBoxFiles(root)
                setIsClickLoading(false)
            },
            onStateChange: (payload: unknown) => {
                const data = payload as { state: string }
                setIsLoading(data.state === 'authenticating' || data.state === 'browsing')
            },
            onError: () => {
                setIsClickLoading(false)
                setShowLoader(false)
            },
        })

        return cleanup
    }, [core])

    const authenticate = useCallback(async () => {
        const plugin = pluginRef.current
        if (!plugin) return
        setIsLoading(true)
        await plugin.authenticateViaPopup()
        if (plugin.isAuthenticated()) {
            await plugin.loadFiles('0')
        }
    }, [])

    const logout = useCallback(() => {
        pluginRef.current?.signOut()
    }, [])

    const handleClick = useCallback(async (file: DriveFile) => {
        const plugin = pluginRef.current
        if (!plugin) return

        if (file.isFolder) {
            setIsClickLoading(true)
            if (boxFiles) {
                setPath(prev => [...prev, boxFiles])
            }
            await plugin.loadFiles(file.id)
        } else {
            setSelectedFiles(prev =>
                prev.some(f => f.id === file.id)
                    ? prev.filter(f => f.id !== file.id)
                    : [...prev, file],
            )
        }
    }, [boxFiles])

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
            // Error handled via event
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
        if (!plugin || !boxFiles) return

        setShowLoader(true)
        setDownloadProgress(0)

        try {
            const folderId = boxFiles.id || '0'
            const allFiles = await plugin.loadAllFilesInFolder(folderId)
            const fileOnly = allFiles.filter(f => !f.isFolder)
            if (fileOnly.length > 0) {
                const downloaded = await plugin.downloadFiles(fileOnly)
                if (downloaded.length > 0) {
                    setFiles(downloaded)
                }
            }
            setSelectedFiles([])
            setActiveAdapter(undefined)
        } catch {
            // Error handled via event
        } finally {
            setShowLoader(false)
            setDownloadProgress(0)
        }
    }, [boxFiles, setFiles, setActiveAdapter])

    return {
        user,
        boxFiles,
        logout,
        authenticate,
        token: isAuthenticated ? 'active' : undefined,
        isAuthenticated,
        isLoading,
        path,
        setPath,
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
