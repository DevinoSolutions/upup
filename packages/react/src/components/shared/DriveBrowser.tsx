import React, { Dispatch, SetStateAction, useMemo, useState } from 'react'
import {
    type DriveBrowserError,
    type DriveFile,
    type DriveFolder,
    type DriveUser,
    formatUiMessage as t,
    pluralUiMessage as plural,
} from '@upupjs/core'
import { cn } from '@upupjs/core/internal'
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
    isClickLoading?: boolean | undefined
    driveFiles?: DriveFolder | undefined
    path: DriveFolder[]
    setPath: Dispatch<SetStateAction<DriveFolder[]>>
    user?: DriveUser | undefined
    handleSignOut: () => Promise<void>
    handleClick: (file: DriveFile) => void | Promise<void>
    selectedFiles: DriveFile[]
    showLoader: boolean
    handleSubmit: () => Promise<void>
    handleCancelDownload: () => void
    onSelectCurrentFolder?: (() => Promise<void> | void) | undefined
    /** The one drive browse-failure surface (F-124). Set = show the banner, not the loader. */
    error?: DriveBrowserError | undefined
    /** Drives the "Load more" button (F-125). */
    hasMore?: boolean | undefined
    isLoadingMore?: boolean | undefined
    loadMore?: (() => void | Promise<void>) | undefined
    'data-upup-slot'?: string | undefined
    signIn?: (() => void) | undefined
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
    error,
    hasMore = false,
    isLoadingMore = false,
    loadMore,
    'data-upup-slot': dataUpupSlot = 'drive-browser',
    ...rest
}: Readonly<Props>): React.ReactElement | null {
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
        () => searchDriveFiles(items ?? [], searchTerm) || [],
        [searchTerm, items],
    )
    // error short-circuits the perpetual loader — the exact F-123/F-124 symptom
    // (a failed load or download previously left the spinner running forever).
    const isLoading = !error && (isClickLoading || !driveFiles)

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
                            // Transparent on the panel gradient — no inner box.
                            className={cn(
                                'upup-h-full upup-overflow-y-auto upup-pt-2',
                                {
                                    'upup-text-[#fafafa] dark:upup-text-[#fafafa]':
                                        dark,
                                },
                                slotClasses.driveBody,
                            )}
                        >
                            {/* Error state: a calm centered message, not a
                                banner strip over an empty list. */}
                            {!!error && (
                                <div className="upup-flex upup-h-full upup-flex-col upup-items-center upup-justify-center upup-px-6 upup-text-center">
                                    <p
                                        data-testid="upup-drive-error"
                                        data-upup-slot="drive-error"
                                        role="alert"
                                        className="upup-text-sm upup-text-red-600 dark:upup-text-red-400"
                                    >
                                        {t(tr.driveLoadError, {
                                            message: error.message,
                                        })}
                                    </p>
                                </div>
                            )}
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
                            {!displayedItems.length && !error && (
                                <div className="upup-flex upup-h-full upup-flex-col upup-items-center upup-justify-center">
                                    <p className="upup-text-xs upup-opacity-70">
                                        {tr.noAcceptedFilesFound}
                                    </p>
                                </div>
                            )}
                            {hasMore && (
                                <button
                                    data-testid="upup-drive-load-more"
                                    data-upup-slot="drive-load-more"
                                    onClick={() => {
                                        void loadMore?.()
                                    }}
                                    disabled={isLoadingMore}
                                    className="upup-mx-auto upup-my-2 upup-block upup-rounded-md upup-px-3 upup-py-1.5 upup-text-sm upup-text-[#0284c7] disabled:upup-opacity-50"
                                >
                                    {isLoadingMore ? tr.loading : tr.loadMore}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Footer only when there is something to act on — never
                        under an error state. Hairline divider, no inner box. */}
                    {(!!selectedFiles.length || !!onSelectCurrentFolder) &&
                        !error && (
                            <div
                                className={cn(
                                    'upup-flex upup-origin-bottom upup-items-center upup-justify-start upup-gap-4 upup-border-t upup-px-3 upup-py-2',
                                    dark
                                        ? 'upup-border-white/[0.08] upup-text-[#fafafa]'
                                        : 'upup-border-black/[0.06]',
                                    slotClasses.driveFooter,
                                )}
                            >
                                {!!onSelectCurrentFolder && (
                                    <button
                                        className={cn(
                                            'upup-rounded-md upup-bg-transparent upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-[#0284c7] upup-transition-all upup-duration-300',
                                            {
                                                'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]':
                                                    dark,
                                            },
                                        )}
                                        onClick={() => {
                                            void onSelectCurrentFolder?.()
                                        }}
                                        disabled={showLoader}
                                    >
                                        {tr.selectThisFolder}
                                    </button>
                                )}
                                <button
                                    className={cn(
                                        'upup-rounded-md upup-bg-[#0ea5e9] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300',
                                        {
                                            'upup-animate-pulse': showLoader,
                                            'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]':
                                                dark,
                                        },
                                        slotClasses.driveAddFilesButton,
                                    )}
                                    onClick={() => {
                                        void handleSubmit()
                                    }}
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
                                        'upup-ml-auto upup-rounded-md upup-p-1 upup-text-sm upup-text-[#0284c7] upup-transition-all upup-duration-300',
                                        {
                                            'upup-text-[#38bdf8] dark:upup-text-[#38bdf8]':
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
