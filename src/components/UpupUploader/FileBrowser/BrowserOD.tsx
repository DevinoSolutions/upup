import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import ListItem from './LiOD'

import { Client } from '@microsoft/microsoft-graph-client'
import ButtonSpinner from 'components/ButtonSpinner'
import { AnimatePresence, motion } from 'framer-motion'
import { MicrosoftUser, OneDriveFile, OneDriveRoot } from 'microsoft'
import { TbSearch } from 'react-icons/tb'
import { useDebouncedCallback } from 'use-debounce'

type Props = {
    driveFiles?: OneDriveRoot | undefined
    handleSignOut: () => void
    user: MicrosoftUser | undefined
    downloadFile: (url: string) => Promise<Blob>
    setFiles: Dispatch<SetStateAction<File[]>>
    setView: (view: string) => void
    accept?: string
    graphClient: Client | null
}

const FileBrowser = ({
    handleSignOut,
    user,
    driveFiles,
    setFiles,
    setView,
    accept,
    graphClient,
}: Props) => {
    const [path, setPath] = useState<OneDriveRoot[]>([])
    const [selectedFiles, setSelectedFiles] = useState<OneDriveFile[]>([])
    const [showLoader, setLoader] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState<number>(0)

    const handleClick = useDebouncedCallback(async (file: OneDriveFile) => {
        if (!graphClient) {
            console.error('Graph client not initialized')
            return
        }

        if (file.isFolder) {
            const fetchFolderContents = async () => {
                try {
                    const response = await graphClient
                        .api(`/me/drive/items/${file.id}/children`)
                        .select(
                            'id,name,folder,file,thumbnails,@microsoft.graph.downloadUrl',
                        )
                        .expand('thumbnails')
                        .get()

                    const files = response.value.map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        isFolder: !!item.folder,
                        children: item.folder ? [] : undefined,
                        thumbnails: item.thumbnails?.[0] || null,
                        '@microsoft.graph.downloadUrl':
                            item['@microsoft.graph.downloadUrl'],
                        file: item.file,
                    }))

                    setPath(prevPath => [
                        ...prevPath,
                        { ...file, children: files },
                    ])
                } catch (error) {
                    console.error('Error fetching folder contents:', error)
                }
            }
            fetchFolderContents()
        } else {
            try {
                console.log('Fetching file info for:', file.name)
                const fileInfo = await graphClient
                    .api(`/me/drive/items/${file.id}`)
                    .select(
                        'id,name,file,thumbnails,@microsoft.graph.downloadUrl',
                    )
                    .get()

                console.log('File info received:', fileInfo)

                if (!fileInfo['@microsoft.graph.downloadUrl']) {
                    console.log(
                        'Download URL not found, creating sharing link...',
                    )
                    const permission = await graphClient
                        .api(`/me/drive/items/${file.id}/createLink`)
                        .post({
                            type: 'view',
                            scope: 'anonymous',
                        })

                    // Convert the sharing URL to a direct download URL
                    const shareUrl = permission.link.webUrl
                    const downloadUrl = shareUrl.replace('redir?', 'download?')
                    fileInfo['@microsoft.graph.downloadUrl'] = downloadUrl
                    console.log('Download URL created:', downloadUrl)
                }

                const updatedFile: OneDriveFile = {
                    ...file,
                    '@microsoft.graph.downloadUrl':
                        fileInfo['@microsoft.graph.downloadUrl'],
                    thumbnails: fileInfo.thumbnails?.[0] || null,
                    file: fileInfo.file,
                }

                console.log('Updated file object:', updatedFile)

                setSelectedFiles(prevFiles => {
                    const newFiles = prevFiles.includes(file)
                        ? prevFiles.filter(f => f.id !== file.id)
                        : [...prevFiles, updatedFile]
                    console.log('Updated selected files:', newFiles)
                    return newFiles
                })
            } catch (error) {
                console.error(
                    `Error fetching file information for ${file.name}:`,
                    error,
                )
            }
        }
    }, 500)

    const getDownloadUrl = async (file: OneDriveFile, graphClient: Client) => {
        // First try to get direct download URL
        const fileInfo = await graphClient
            .api(`/me/drive/items/${file.id}`)
            .select('@microsoft.graph.downloadUrl')
            .get()

        if (fileInfo['@microsoft.graph.downloadUrl']) {
            return fileInfo['@microsoft.graph.downloadUrl']
        }

        // Fallback to creating a sharing link
        console.log('No direct download URL, creating sharing link...')
        const permission = await graphClient
            .api(`/me/drive/items/${file.id}/createLink`)
            .post({
                type: 'view',
                scope: 'anonymous',
            })

        const shareId = permission.link.webUrl.split('/s!/')[1]
        const sharedItem = await graphClient
            .api(`/shares/u!${shareId}`)
            .expand('driveItem')
            .get()

        return sharedItem.driveItem['@microsoft.graph.downloadUrl']
    }

    const downloadFile = async (
        url: string,
        fileName: string,
        mimeType = 'application/octet-stream',
    ) => {
        const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const blob = await response.blob()
        return new File([blob], fileName, {
            type: mimeType || 'application/octet-stream',
        })
    }

    const downloadFiles = async (files: OneDriveFile[]) => {
        const promises = files.map(async (file, index) => {
            console.log('Processing file:', file)

            try {
                const downloadUrl = await getDownloadUrl(file, graphClient!)
                if (!downloadUrl) {
                    throw new Error('Could not get download URL')
                }

                console.log('Got download URL:', downloadUrl)

                const downloadedFile = await downloadFile(
                    downloadUrl,
                    file.name,
                    file.file?.mimeType,
                )

                // Add thumbnail if available
                if (file.thumbnails?.large?.url) {
                    Object.defineProperty(downloadedFile, 'thumbnailLink', {
                        value: file.thumbnails.large.url,
                        writable: true,
                        enumerable: true,
                        configurable: true,
                    })
                }

                // Update progress
                setDownloadProgress(
                    Math.round(((index + 1) / files.length) * 100),
                )
                console.log('File downloaded successfully:', file.name)

                return downloadedFile
            } catch (error) {
                console.error(`Error downloading file ${file.name}:`, error)
                throw new Error(
                    `Failed to download ${file.name}: ${
                        (error as Error).message
                    }`,
                )
            }
        })

        try {
            return await Promise.all(promises)
        } catch (error) {
            console.error('Error in downloadFiles:', error)
            throw error
        }
    }

    const handleSubmit = async () => {
        if (selectedFiles.length === 0) return

        setLoader(true)
        setDownloadProgress(0)

        try {
            console.log(
                'Starting file download process with files:',
                selectedFiles,
            )

            // Process one file at a time
            const downloadedFiles: File[] = []

            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i]
                const [downloadedFile] = await downloadFiles([file])
                downloadedFiles.push(downloadedFile)

                // Update progress
                const progress = Math.round(
                    ((i + 1) / selectedFiles.length) * 100,
                )
                setDownloadProgress(progress)

                console.log(
                    `Downloaded ${i + 1} of ${selectedFiles.length} files`,
                )

                // Add a small delay between files
                await new Promise(resolve => setTimeout(resolve, 500))
            }

            console.log('All files downloaded successfully:', downloadedFiles)

            // Update the files state
            setFiles(prevFiles => [...prevFiles, ...downloadedFiles])

            // Clear selection and return to internal view
            setSelectedFiles([])
            setDownloadProgress(0)
            setView('internal')

            console.log(`Successfully added ${downloadedFiles.length} files`)
        } catch (error) {
            console.error('Error processing files:', error)
            alert(`Error downloading files: ${(error as Error).message}`)
        } finally {
            setLoader(false)
            setDownloadProgress(0)
        }
    }

    useEffect(() => {
        if (driveFiles) setPath([driveFiles])
    }, [driveFiles])

    return (
        <div className="grid h-[min(98svh,32rem)] w-full grid-rows-[auto,auto,1fr,auto] bg-white ">
            <div className="grid h-12 grid-cols-[minmax(0,1fr),auto] border-b bg-[#fafafa] p-2 text-xs font-medium text-[#333] dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                <div className="h flex gap-1 p-2 px-4">
                    {path &&
                        path.map((p, i) => (
                            <p
                                key={p.id}
                                className="group flex shrink-0 cursor-pointer gap-1 truncate"
                                style={{
                                    maxWidth: 100 / path.length + '%',
                                    pointerEvents:
                                        i === path.length - 1 ? 'none' : 'auto',
                                }}
                                onClick={() =>
                                    setPath(prev => prev.slice(0, i + 1))
                                }
                            >
                                <span className="truncate group-hover:underline">
                                    {p.name}
                                </span>
                                {i !== path.length - 1 && ' > '}
                            </p>
                        ))}
                </div>
                <div className="flex items-center gap-2">
                    <h1>{user ? user.name : ''}</h1>
                    <i className="-mb-1 h-[3px] w-[3px] rounded-full bg-[#ddd]" />
                    <button
                        className="text-[#2275d7] hover:underline"
                        onClick={() => {
                            if (user) {
                                handleSignOut()
                                setView('internal')
                            }
                        }}
                    >
                        {user ? 'Log out' : 'Log in'}
                    </button>
                </div>
            </div>

            <div className="relative bg-white p-2  dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                <input
                    type="search"
                    className="h-8 w-full rounded-md bg-[#eaeaea] px-2 pl-8 text-xs outline-none transition-all duration-300 focus:bg-[#cfcfcf] dark:bg-[#2f2f2f] dark:text-[#fafafa]"
                    placeholder="Search"
                />
                <TbSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939393]" />
            </div>

            <div className="h-full overflow-scroll overflow-y-scroll bg-white pt-2 dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                {path && path.at(-1)?.children.length ? (
                    <ul className="p-2">
                        {path.at(-1)?.children?.map((file, index) => {
                            return (
                                <ListItem
                                    key={file.id}
                                    file={file}
                                    handleClick={handleClick}
                                    index={index}
                                    selectedFiles={selectedFiles}
                                    accept={accept}
                                />
                            )
                        })}
                    </ul>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                        <h1 className="text-sm">No files found</h1>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedFiles.length > 0 && (
                    <motion.div
                        initial={{ y: '100%', height: 0 }}
                        animate={{ y: '0%', height: 'auto' }}
                        exit={{ y: '100%', height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex origin-bottom items-center justify-start gap-4 border-t bg-white p-4 py-2 dark:bg-[#1f1f1f] dark:text-[#fafafa]"
                    >
                        {!showLoader ? (
                            <button
                                className="w-32 rounded-md bg-blue-500 p-3 font-medium text-white transition-all duration-300 hover:bg-blue-600 active:bg-blue-700"
                                onClick={handleSubmit}
                            >
                                Add {selectedFiles.length} files
                            </button>
                        ) : (
                            <div className="flex items-center gap-4">
                                <ButtonSpinner />
                                <span className="text-sm">
                                    Downloading... {downloadProgress}%
                                </span>
                            </div>
                        )}
                        <button
                            className="hover:underline"
                            onClick={() => {
                                setSelectedFiles([])
                                setDownloadProgress(0)
                            }}
                            disabled={showLoader}
                        >
                            Cancel
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default FileBrowser
