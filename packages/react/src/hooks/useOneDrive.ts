import { useCallback, useEffect, useRef, useState } from 'react'
import { OneDrivePlugin, type DriveFile, type DriveFolder, type DriveUser } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/RootContext'

export default function useOneDrive() {
    const { core } = useUploaderRuntime()
    const { oneDriveConfigs, setActiveAdapter } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    const [user, setUser] = useState<DriveUser>()
    const [oneDriveFiles, setOneDriveFiles] = useState<DriveFolder>()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [path, setPath] = useState<DriveFolder[]>([])
    const [selectedFiles, setSelectedFiles] = useState<DriveFile[]>([])
    const [showLoader, setShowLoader] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const [isClickLoading, setIsClickLoading] = useState(false)

    const pluginRef = useRef<OneDrivePlugin | null>(null)

    useEffect(() => {
        if (!core) return
        const plugin = core.getPlugin?.('one-drive') as OneDrivePlugin | undefined
        if (!plugin) return
        pluginRef.current = plugin

        const restored = plugin.restoreSession()
        setIsAuthenticated(restored)
        setIsLoading(false)

        if (restored) {
            void (async () => {
                try {
                    const userInfo = await plugin.getUserInfo()
                    if (userInfo) setUser(userInfo)
                } catch {
                    // Profile fetch is non-critical
                }
                await plugin.loadFiles()
            })()
        }

        const unsubs = [
            core.on('onedrive:authenticated', (payload: unknown) => {
                const data = payload as { user?: DriveUser }
                if (data.user) setUser(data.user)
                setIsAuthenticated(true)
                setIsLoading(false)
            }),
            core.on('onedrive:signed-out', () => {
                setUser(undefined)
                setOneDriveFiles(undefined)
                setIsAuthenticated(false)
                setPath([])
                setSelectedFiles([])
            }),
            core.on('onedrive:session-expired', () => {
                setUser(undefined)
                setOneDriveFiles(undefined)
                setIsAuthenticated(false)
                setPath([])
            }),
            core.on('onedrive:files-loaded', (payload: unknown) => {
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
                setOneDriveFiles(root)
                setIsClickLoading(false)
            }),
            core.on('onedrive:state-change', (payload: unknown) => {
                const data = payload as { state: string }
                setIsLoading(data.state === 'authenticating' || data.state === 'browsing')
            }),
            core.on('onedrive:error', () => {
                setIsClickLoading(false)
                setShowLoader(false)
            }),
        ]

        return () => { unsubs.forEach(u => u()) }
    }, [core])

    const authenticate = useCallback(async () => {
        const plugin = pluginRef.current
        if (!plugin) return
        setIsLoading(true)
        await plugin.authenticateViaPopup()
        if (plugin.isAuthenticated()) {
            await plugin.loadFiles()
        }
    }, [])

    const signOut = useCallback(() => {
        pluginRef.current?.signOut()
    }, [])

    const handleClick = useCallback(async (file: DriveFile) => {
        const plugin = pluginRef.current
        if (!plugin) return

        if (file.isFolder) {
            setIsClickLoading(true)
            if (oneDriveFiles) {
                setPath(prev => [...prev, oneDriveFiles])
            }
            await plugin.loadFiles(file.id)
        } else {
            setSelectedFiles(prev =>
                prev.some(f => f.id === file.id)
                    ? prev.filter(f => f.id !== file.id)
                    : [...prev, file],
            )
        }
    }, [oneDriveFiles])

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
        if (!plugin || !oneDriveFiles) return

        setShowLoader(true)
        setDownloadProgress(0)

        try {
            const folderId = oneDriveFiles.id || 'root'
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
    }, [oneDriveFiles, setFiles, setActiveAdapter])

    return {
        user,
        oneDriveFiles,
        signOut,
        signIn: authenticate,
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
