'use client'

import { motion } from 'framer-motion'
import React, {
    Dispatch,
    SetStateAction,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { useUploaderContext } from '../../context/uploader-context'
import { cn } from '../../lib/tailwind'
import { searchDriveFiles } from '../../lib/google-drive-utils'
import type {
    GoogleFile,
    GoogleRoot,
    MicrosoftUser,
    GoogleUser,
    OneDriveFile,
    OneDriveRoot,
} from '../../lib/google-drive-utils'
import DriveBrowserHeader from './drive-browser-header'
import DriveBrowserItem from './drive-browser-item'

type Props = {
    isClickLoading?: boolean
    driveFiles?: OneDriveRoot | GoogleRoot
    path: GoogleRoot[] | OneDriveRoot[]
    setPath:
        | Dispatch<SetStateAction<GoogleRoot[]>>
        | Dispatch<SetStateAction<OneDriveRoot[]>>
    user?: MicrosoftUser | GoogleUser
    handleSignOut: () => Promise<void>
    handleClick:
        | ((file: OneDriveFile) => Promise<void>)
        | ((file: GoogleFile | GoogleRoot) => void)
    selectedFiles: OneDriveFile[] | GoogleFile[]
    showLoader: boolean
    handleSubmit: () => Promise<void>
    handleCancelDownload: () => void
    onSelectCurrentFolder?: () => Promise<void> | void
}

function filterItems(
    item: OneDriveFile | GoogleFile,
    accept: string,
): boolean {
    const isFolder = Boolean(
        (item as OneDriveFile).isFolder || (item as GoogleFile).children,
    )
    if (isFolder) return true
    if (!accept || accept === '*') return true

    const isGoogleFile = 'mimeType' in item && !('isFolder' in item)
    if (isGoogleFile) {
        // Simple extension check for Google files
        const ext = item.name.split('.').pop()?.toLowerCase() || ''
        return accept.includes(ext) || accept.includes((item as GoogleFile).mimeType || '')
    }

    return accept.includes(item.name.split('.').pop()!)
}

export default function DriveBrowser({
    isClickLoading = false,
    driveFiles,
    path,
    setPath,
    handleClick,
    selectedFiles,
    showLoader,
    handleSubmit,
    handleCancelDownload,
    onSelectCurrentFolder,
    ...rest
}: Readonly<Props>) {
    const { dark, classNames } = useUploaderContext()

    // Get accept from core options if available
    const accept = (useUploaderContext() as any)?.core?.options?.accept ?? ''

    const [searchTerm, setSearchTerm] = useState('')
    const items = (path[path.length - 1]?.children as Array<any>)?.filter(
        (item) => filterItems(item, accept),
    )
    const displayedItems = useMemo(
        () => searchDriveFiles<any>(items, searchTerm) || [],
        [searchTerm, items],
    )
    const isLoading = isClickLoading || !driveFiles

    useEffect(() => {
        if (driveFiles)
            (setPath as Dispatch<SetStateAction<any[]>>)([driveFiles as any])
    }, [driveFiles, setPath])

    if (isLoading) {
        return (
            <div className="upup-flex upup-h-full upup-w-full upup-items-center upup-justify-center">
                <div className="upup-h-8 upup-w-8 upup-animate-spin upup-rounded-full upup-border-2 upup-border-blue-500 upup-border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto">
            <DriveBrowserHeader
                showSearch={!!items?.length}
                path={path}
                setPath={setPath}
                searchTerm={searchTerm}
                onSearch={setSearchTerm}
                {...rest}
            />
            {!!path && (
                <div
                    className={cn(
                        'upup-h-full upup-overflow-y-scroll upup-bg-black/[0.075] upup-pt-2',
                        {
                            'upup-bg-white/10 upup-text-[#fafafa] dark:upup-bg-white/10 dark:upup-text-[#fafafa]':
                                dark,
                        },
                        (classNames as any)?.driveBody,
                    )}
                >
                    {!!displayedItems.length ? (
                        <ul className="upup-p-2">
                            {displayedItems.map(
                                (file: OneDriveFile | GoogleFile, index: number) => (
                                    <DriveBrowserItem
                                        key={file.id}
                                        file={file}
                                        handleClick={
                                            isClickLoading || showLoader
                                                ? () => {}
                                                : handleClick
                                        }
                                        index={index}
                                        selectedFiles={selectedFiles}
                                    />
                                ),
                            )}
                        </ul>
                    ) : (
                        <div className="upup-flex upup-h-full upup-flex-col upup-items-center upup-justify-center">
                            <p className="upup-text-xs upup-opacity-70">
                                No accepted files found
                            </p>
                        </div>
                    )}
                </div>
            )}

            {(!!selectedFiles.length || !!onSelectCurrentFolder) && (
                <motion.div
                    key="drive-browser"
                    initial={{ y: '100%', height: 0 }}
                    animate={{ y: '0%', height: 'auto' }}
                    exit={{ y: '100%', height: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                        'upup-flex upup-origin-bottom upup-items-center upup-justify-start upup-gap-4 upup-bg-black/[0.025] upup-px-3 upup-py-2',
                        {
                            'upup-bg-white/5 upup-text-[#fafafa] dark:upup-bg-white/5 dark:upup-text-[#fafafa]':
                                dark,
                        },
                        (classNames as any)?.driveFooter,
                    )}
                >
                    {!!onSelectCurrentFolder && (
                        <button
                            className={cn(
                                'upup-rounded-md upup-bg-transparent upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-blue-600 upup-transition-all upup-duration-300',
                                {
                                    'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]':
                                        dark,
                                },
                            )}
                            onClick={() => onSelectCurrentFolder?.()}
                            disabled={showLoader}
                        >
                            Select this folder
                        </button>
                    )}
                    <button
                        className={cn(
                            'upup-rounded-md upup-bg-blue-600 upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300',
                            {
                                'upup-animate-pulse': showLoader,
                                'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]':
                                    dark,
                            },
                            (classNames as any)?.driveAddFilesButton,
                        )}
                        onClick={handleSubmit}
                        disabled={showLoader}
                    >
                        Add {selectedFiles.length} file
                        {selectedFiles.length !== 1 ? 's' : ''}
                    </button>
                    <button
                        className={cn(
                            'upup-ml-auto upup-rounded-md upup-p-1 upup-text-sm upup-text-blue-600 upup-transition-all upup-duration-300',
                            {
                                'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]':
                                    dark,
                            },
                            (classNames as any)?.driveCancelFilesButton,
                        )}
                        onClick={handleCancelDownload}
                        disabled={showLoader}
                    >
                        Cancel
                    </button>
                </motion.div>
            )}
        </div>
    )
}
