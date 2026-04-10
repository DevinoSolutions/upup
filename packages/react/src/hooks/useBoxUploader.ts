'use client'
import { useCallback, useState } from 'react'
import { t } from '../shared/i18n'
import { useRootContext } from '../context/RootContext'

const BOX_API = 'https://api.box.com/2.0'

type BoxItem = { id: string; name: string; type: string; size?: number; isFolder: boolean }
type BoxFolder = BoxItem & { children?: BoxItem[] }

export default function useBoxUploader(token?: string) {
    const {
        core,
        props: { onError, accept },
        setActiveAdapter,
        setFiles,
        translations,
    } = useRootContext()

    const [path, setPath] = useState<BoxFolder[]>([])
    const [selectedFiles, setSelectedFiles] = useState<BoxItem[]>([])
    const [showLoader, setShowLoader] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const [isClickLoading, setIsClickLoading] = useState(false)

    const fetchFolderContents = useCallback(async (folder: BoxItem) => {
        if (!token) return
        setIsClickLoading(true)
        try {
            const res = await fetch(
                `${BOX_API}/folders/${folder.id}/items?fields=id,name,type,size&limit=1000`,
                { headers: { Authorization: `Bearer ${token}` } },
            )
            if (!res.ok) throw new Error(`Box API error ${res.status}`)
            const data = await res.json()
            const items: BoxItem[] = (data.entries || []).map((e: any) => ({
                id: e.id,
                name: e.name,
                type: e.type,
                size: e.size,
                isFolder: e.type === 'folder',
            }))
            setPath(prev => [...prev, { ...folder, children: items }])
        } catch (e) {
            onError((e as Error).message)
            core?.emit('box-folder-error', { error: e })
        } finally {
            setIsClickLoading(false)
        }
    }, [token, onError, core])

    const handleClick = useCallback(async (file: BoxItem) => {
        if (file.isFolder) {
            await fetchFolderContents(file)
        } else {
            setSelectedFiles(prev => {
                const already = prev.some(f => f.id === file.id)
                return already ? prev.filter(f => f.id !== file.id) : [...prev, file]
            })
        }
    }, [fetchFolderContents])

    const downloadFile = useCallback(async (file: BoxItem): Promise<File | undefined> => {
        if (!token) return
        try {
            const res = await fetch(`${BOX_API}/files/${file.id}/content`, {
                headers: { Authorization: `Bearer ${token}` },
                redirect: 'follow',
            })
            if (!res.ok) throw new Error(`Download failed: ${res.status}`)
            const blob = await res.blob()
            return new File([blob], file.name, { type: blob.type || 'application/octet-stream' })
        } catch (e) {
            onError((e as Error).message)
            core?.emit('box-download-error', { error: e, fileName: file.name })
        }
    }, [token, onError, core])

    const downloadFiles = useCallback(async (files: BoxItem[]) => {
        if (!token) {
            onError(translations.boxNoAccessToken)
            return
        }
        const results = await Promise.all(
            files.map(async (file, i) => {
                const f = await downloadFile(file)
                setDownloadProgress(Math.round(((i + 1) / files.length) * 100))
                return f
            }),
        )
        return results.filter(Boolean) as File[]
    }, [token, downloadFile, onError, translations])

    const handleSubmit = useCallback(async () => {
        if (!selectedFiles.length) return
        setShowLoader(true)
        setDownloadProgress(0)
        try {
            const downloaded = await downloadFiles(selectedFiles)
            if (downloaded) setFiles(downloaded)
            setSelectedFiles([])
            setActiveAdapter(undefined)
            core?.emit('box-files-submit', { files: downloaded })
        } catch (e) {
            onError(t(translations.errorProcessingFiles, { message: (e as Error)?.message ?? '' }))
        } finally {
            setShowLoader(false)
            setDownloadProgress(0)
        }
    }, [selectedFiles, downloadFiles, setFiles, setActiveAdapter, onError, translations, core])

    const handleCancelDownload = useCallback(() => {
        setSelectedFiles([])
        setDownloadProgress(0)
        core?.emit('box-cancel', {})
    }, [core])

    return {
        path,
        setPath,
        isClickLoading,
        handleClick,
        selectedFiles,
        showLoader,
        handleSubmit,
        downloadProgress,
        handleCancelDownload,
        onSelectCurrentFolder: () => Promise.resolve(),
    }
}
