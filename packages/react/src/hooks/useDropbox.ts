import { useCallback, useEffect, useRef, useState } from 'react'
import { DropboxPlugin, type DriveFile } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/RootContext'

interface DropboxUser {
    name: string
    email: string
}

interface DropboxRoot {
    id: string
    name: string
    isFolder: true
    path_display?: string
    children: DriveFile[]
}

export function useDropbox() {
    const { core } = useUploaderRuntime()
    const { dropboxConfigs, setActiveAdapter } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    const [user, setUser] = useState<DropboxUser>()
    const [dropboxFiles, setDropboxFiles] = useState<DropboxRoot>()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [path, setPath] = useState<DropboxRoot[]>([])
    const [selectedFiles, setSelectedFiles] = useState<DriveFile[]>([])
    const [showLoader, setShowLoader] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const [isClickLoading, setIsClickLoading] = useState(false)

    const pluginRef = useRef<DropboxPlugin | null>(null)

    useEffect(() => {
        if (!core) return
        const plugin = core.getPlugin?.('dropbox') as DropboxPlugin | undefined
        if (!plugin) return
        pluginRef.current = plugin

        const restored = plugin.restoreSession()
        setIsAuthenticated(restored)
        setIsLoading(false)

        if (restored) {
            void (async () => {
                const userInfo = await plugin.getUserInfo()
                if (userInfo) setUser(userInfo)
                await plugin.loadFiles('')
            })()
        }

        const unsubs = [
            core.on('dropbox:authenticated', (payload: unknown) => {
                const data = payload as { user?: DropboxUser }
                if (data.user) setUser(data.user)
                setIsAuthenticated(true)
                setIsLoading(false)
            }),
            core.on('dropbox:signed-out', () => {
                setUser(undefined)
                setDropboxFiles(undefined)
                setIsAuthenticated(false)
                setPath([])
                setSelectedFiles([])
            }),
            core.on('dropbox:session-expired', () => {
                setUser(undefined)
                setDropboxFiles(undefined)
                setIsAuthenticated(false)
                setPath([])
            }),
            core.on('dropbox:files-loaded', (payload: unknown) => {
                const data = payload as { files: DriveFile[]; path: string }
                const root: DropboxRoot = {
                    id: data.path || 'root',
                    name: data.path ? data.path.split('/').pop() || 'Dropbox' : 'Dropbox',
                    isFolder: true,
                    path_display: data.path,
                    children: data.files,
                }
                setDropboxFiles(root)
                setIsClickLoading(false)
            }),
            core.on('dropbox:state-change', (payload: unknown) => {
                const data = payload as { state: string }
                setIsLoading(data.state === 'authenticating' || data.state === 'browsing')
            }),
            core.on('dropbox:error', () => {
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
            await plugin.loadFiles('')
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
            if (dropboxFiles) {
                setPath(prev => [...prev, dropboxFiles])
            }
            await plugin.loadFiles(file.path)
        } else {
            setSelectedFiles(prev =>
                prev.some(f => f.id === file.id)
                    ? prev.filter(f => f.id !== file.id)
                    : [...prev, file],
            )
        }
    }, [dropboxFiles])

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
        if (!plugin || !dropboxFiles) return

        setShowLoader(true)
        setDownloadProgress(0)

        try {
            const currentPath = dropboxFiles.path_display || ''
            const allFiles = await plugin.loadAllFilesInFolder(currentPath)
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
    }, [dropboxFiles, setFiles, setActiveAdapter])

    return {
        user,
        dropboxFiles,
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
