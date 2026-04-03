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
    // Get accept from core options if available
    const accept = useUploaderContext().core.options.accept ?? ''

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
            <div
                className="upup-flex upup-h-full upup-w-full upup-items-center upup-justify-center"
                data-upup-slot="driveBrowser.loading"
            >
                <div className="upup-h-8 upup-w-8 upup-animate-spin upup-rounded-full upup-border-2 upup-border-t-transparent" style={{ borderColor: 'var(--upup-color-primary)' }} />
            </div>
        )
    }

    return (
        <div
            className="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto"
            data-upup-slot="driveBrowser.root"
        >
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
                    className="upup-h-full upup-overflow-y-scroll upup-pt-2"
                    style={{
                        backgroundColor: 'var(--upup-color-surface-alt)',
                        color: 'var(--upup-color-text)',
                    }}
                    data-upup-slot="driveBrowser.body"
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
                    className="upup-flex upup-origin-bottom upup-items-center upup-justify-start upup-gap-4 upup-px-3 upup-py-2"
                    style={{ backgroundColor: 'var(--upup-color-surface-alt)' }}
                    data-upup-slot="driveBrowser.footer"
                >
                    {!!onSelectCurrentFolder && (
                        <button
                            className="upup-rounded-md upup-bg-transparent upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-transition-all upup-duration-300"
                            style={{ color: 'var(--upup-color-primary)' }}
                            onClick={() => onSelectCurrentFolder?.()}
                            disabled={showLoader}
                        >
                            Select this folder
                        </button>
                    )}
                    <button
                        className={cn(
                            'upup-rounded-md upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300',
                            { 'upup-animate-pulse': showLoader },
                        )}
                        style={{ backgroundColor: 'var(--upup-color-primary)' }}
                        onClick={handleSubmit}
                        disabled={showLoader}
                        data-upup-slot="driveBrowser.addFilesButton"
                    >
                        Add {selectedFiles.length} file
                        {selectedFiles.length !== 1 ? 's' : ''}
                    </button>
                    <button
                        className="upup-ml-auto upup-rounded-md upup-p-1 upup-text-sm upup-transition-all upup-duration-300"
                        style={{ color: 'var(--upup-color-primary)' }}
                        onClick={handleCancelDownload}
                        disabled={showLoader}
                        data-upup-slot="driveBrowser.cancelFilesButton"
                    >
                        Cancel
                    </button>
                </motion.div>
            )}
        </div>
    )
}
