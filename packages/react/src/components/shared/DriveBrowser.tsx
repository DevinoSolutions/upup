import React, { Dispatch, SetStateAction, useMemo, useState } from 'react'
import {
    type DriveFile,
    type DriveFolder,
    type DriveUser,
    cn,
    formatUiMessage as t,
    pluralUiMessage as plural,
} from '@upup/core'
import {
    useUploaderI18n,
    useUploaderOptions,
    useUploaderTheme,
} from '../../context/UploaderContext'
import { searchDriveFiles } from '../../lib/file'
import SourceViewContainer from './SourceViewContainer'
import DriveBrowserHeader from './DriveBrowserHeader'
import DriveBrowserItem from './DriveBrowserItem'

type Props = {
    isClickLoading?: boolean
    driveFiles?: DriveFolder
    path: DriveFolder[]
    setPath: Dispatch<SetStateAction<DriveFolder[]>>
    user?: DriveUser
    handleSignOut: () => Promise<void>
    handleClick: (file: DriveFile) => void | Promise<void>
    selectedFiles: DriveFile[]
    showLoader: boolean
    handleSubmit: () => Promise<void>
    handleCancelDownload: () => void
    onSelectCurrentFolder?: () => Promise<void> | void
    'data-upup-slot'?: string
}

function filterItems(item: DriveFile, accept: string) {
    if (item.isFolder) return true
    if (!accept || accept === '*') return true
    return accept.split(',').some(pattern => {
        const p = pattern.trim()
        if (p.startsWith('.')) return item.name.endsWith(p)
        if (p.endsWith('/*'))
            return item.mimeType.startsWith(p.replace('/*', '/'))
        return item.mimeType === p
    })
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
    'data-upup-slot': dataUpupSlot = 'drive-browser',
    ...rest
}: Readonly<Props>) {
    const {
        allowedFileTypes,
        icons: { LoaderIcon },
    } = useUploaderOptions()
    const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
    const { translations: tr } = useUploaderI18n()
    const [searchTerm, setSearchTerm] = useState('')
    const items = path[path.length - 1]?.children?.filter(item =>
        filterItems(item, allowedFileTypes),
    )
    const displayedItems = useMemo(
        () => searchDriveFiles(items, searchTerm) || [],
        [searchTerm, items],
    )
    const isLoading = isClickLoading || !driveFiles

    return (
        <SourceViewContainer
            isLoading={isLoading}
            data-upup-slot={dataUpupSlot}
        >
            {isLoading ? (
                <LoaderIcon />
            ) : (
                <div
                    data-testid="upup-drive-browser"
                    className="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto"
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
                            className={cn(
                                'upup-h-full upup-overflow-y-scroll upup-bg-black/[0.075] upup-pt-2',
                                {
                                    'upup-bg-white/10 upup-text-[#fafafa] dark:upup-bg-white/10 dark:upup-text-[#fafafa]':
                                        dark,
                                },
                                slotClasses.driveBody,
                            )}
                        >
                            {!!displayedItems.length && (
                                <ul className="upup-p-2">
                                    {displayedItems.map(file => {
                                        return (
                                            <DriveBrowserItem
                                                key={file.id}
                                                file={file}
                                                handleClick={
                                                    isClickLoading || showLoader
                                                        ? () => {}
                                                        : handleClick
                                                }
                                                selectedFiles={selectedFiles}
                                            />
                                        )
                                    })}
                                </ul>
                            )}
                            {!displayedItems.length && (
                                <div className="upup-flex upup-h-full upup-flex-col upup-items-center upup-justify-center">
                                    <p className="upup-text-xs upup-opacity-70">
                                        {tr.noAcceptedFilesFound}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {(!!selectedFiles.length || !!onSelectCurrentFolder) && (
                        <div
                            className={cn(
                                'upup-flex upup-origin-bottom upup-items-center upup-justify-start upup-gap-4 upup-bg-black/[0.025] upup-px-3 upup-py-2',
                                {
                                    'upup-bg-white/5 upup-text-[#fafafa] dark:upup-bg-white/5 dark:upup-text-[#fafafa]':
                                        dark,
                                },
                                slotClasses.driveFooter,
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
                                    {tr.selectThisFolder}
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
                                    slotClasses.driveAddFilesButton,
                                )}
                                onClick={handleSubmit}
                                disabled={showLoader}
                            >
                                {t(
                                    plural(
                                        tr,
                                        'addFiles',
                                        selectedFiles.length,
                                    ),
                                    { count: selectedFiles.length },
                                )}
                            </button>
                            <button
                                className={cn(
                                    'upup-ml-auto upup-rounded-md upup-p-1 upup-text-sm upup-text-blue-600 upup-transition-all upup-duration-300',
                                    {
                                        'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]':
                                            dark,
                                    },
                                    slotClasses.driveCancelFilesButton,
                                )}
                                onClick={handleCancelDownload}
                                disabled={showLoader}
                            >
                                {tr.cancel}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </SourceViewContainer>
    )
}
