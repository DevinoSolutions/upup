import { useCallback, useEffect, useRef, useState } from 'react'
import { BoxPlugin, type DriveFile } from '@upup/core'
import {
    useUploaderFiles,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/RootContext'

interface BoxUser {
    name: string
    email: string
}

interface BoxRoot {
    id: string
    name: string
    isFolder: true
    children: DriveFile[]
}

export function useBox() {
    const { core } = useUploaderRuntime()
    const { boxConfigs, setActiveAdapter } = useUploaderSource()
    const { setFiles } = useUploaderFiles()

    const [user, setUser] = useState<BoxUser>()
    const [boxFiles, setBoxFiles] = useState<BoxRoot>()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [path, setPath] = useState<BoxRoot[]>([])
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

        const unsubs = [
            core.on('box:authenticated', (payload: unknown) => {
                const data = payload as { user?: BoxUser }
                if (data.user) setUser(data.user)
                setIsAuthenticated(true)
                setIsLoading(false)
            }),
            core.on('box:signed-out', () => {
                setUser(undefined)
                setBoxFiles(undefined)
                setIsAuthenticated(false)
                setPath([])
                setSelectedFiles([])
            }),
            core.on('box:session-expired', () => {
                setUser(undefined)
                setBoxFiles(undefined)
                setIsAuthenticated(false)
                setPath([])
            }),
            core.on('box:files-loaded', (payload: unknown) => {
                const data = payload as { files: DriveFile[]; folderId: string }
                const root: BoxRoot = {
                    id: data.folderId || '0',
                    name: data.folderId === '0' || !data.folderId ? 'Box' : data.folderId,
                    isFolder: true,
                    children: data.files,
                }
                setBoxFiles(root)
                setIsClickLoading(false)
            }),
            core.on('box:state-change', (payload: unknown) => {
                const data = payload as { state: string }
                setIsLoading(data.state === 'authenticating' || data.state === 'browsing')
            }),
            core.on('box:error', () => {
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
