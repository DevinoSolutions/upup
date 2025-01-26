import { AnimatePresence, motion } from 'framer-motion'
import { GoogleFile, Root, User } from 'google'
import { MicrosoftUser, OneDriveFile, OneDriveRoot } from 'microsoft'
import React, {
    Dispatch,
    SetStateAction,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { useRootContext } from '../../context/RootContext'
import { searchDriveFiles } from '../../lib/file'
import { cn } from '../../lib/tailwind'
import DriveBrowserHeader from './DriveBrowserHeader'
import DriveBrowserItem from './DriveBrowserItem'
import ShouldRender from './ShouldRender'

type Props = {
    isClickLoading?: boolean
    driveFiles?: OneDriveRoot | Root
    path: Root[] | OneDriveRoot[]
    setPath:
        | Dispatch<SetStateAction<Array<Root>>>
        | Dispatch<SetStateAction<Array<OneDriveRoot>>>
    user?: MicrosoftUser | User
    handleSignOut: () => Promise<void>
    handleClick:
        | ((file: OneDriveFile) => Promise<void>)
        | ((file: GoogleFile | Root) => void)
    selectedFiles: OneDriveFile[] | GoogleFile[]
    showLoader: boolean
    handleSubmit: () => Promise<void>
    downloadProgress: number
    handleCancelDownload: () => void
}

function filterItems(item: OneDriveFile | GoogleFile, accept: string) {
    const isFolder = Boolean(
        (item as OneDriveFile).isFolder || (item as GoogleFile).children,
    )
    const isFileAccepted =
        accept && accept !== '*' && !isFolder
            ? accept.includes(item.name.split('.').pop()!)
            : true
    return isFolder ? item : isFileAccepted
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
    ...rest
}: Props) {
    const {
        props: { accept, dark, classNames },
    } = useRootContext()
    const [searchTerm, setSearchTerm] = useState('')
    const items = (path[path.length - 1]?.children as Array<any>)?.filter(
        item => filterItems(item, accept),
    )
    const displayedItems = useMemo(
        () => searchDriveFiles<any>(items, searchTerm) || [],
        [searchTerm, items],
    )
    const isLoading = isClickLoading || !driveFiles

    useEffect(() => {
        if (driveFiles) setPath([driveFiles as any])
    }, [driveFiles, setPath])

    return (
        <div
            className={cn('flex items-center justify-center overflow-hidden', {
                'bg-black/[0.075]': isLoading,
                'bg-white/10 text-[#FAFAFA] dark:bg-white/10 dark:text-[#FAFAFA]':
                    isLoading && dark,
                [classNames.adapterView!]: !isLoading && classNames.adapterView,
                [classNames.adapterDriveLoading!]:
                    isLoading && classNames.adapterDriveLoading,
            })}
        >
            <ShouldRender if={true} isLoading={isLoading}>
                <div className="grid h-full w-full grid-rows-[auto,1fr,auto] overflow-auto">
                    <DriveBrowserHeader
                        showSearch={!!items?.length}
                        path={path}
                        setPath={setPath}
                        searchTerm={searchTerm}
                        onSearch={setSearchTerm}
                        {...rest}
                    />
                    <ShouldRender if={!!path}>
                        <div
                            className={cn(
                                'h-full overflow-y-scroll bg-black/[0.075] pt-2',
                                {
                                    'bg-white/10 text-[#fafafa] dark:bg-white/10 dark:text-[#fafafa]':
                                        dark,
                                },
                                classNames.driveBody,
                            )}
                        >
                            <ShouldRender if={!!displayedItems.length}>
                                <ul className="p-2">
                                    {displayedItems.map((file, index) => {
                                        return (
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
                                        )
                                    })}
                                </ul>
                            </ShouldRender>
                            <ShouldRender if={!displayedItems.length}>
                                <div className="flex h-full flex-col items-center justify-center">
                                    <p className="text-xs opacity-70">
                                        No accepted files found
                                    </p>
                                </div>
                            </ShouldRender>
                        </div>
                    </ShouldRender>

                    <ShouldRender if={!!selectedFiles.length}>
                        <AnimatePresence>
                            <motion.div
                                initial={{ y: '100%', height: 0 }}
                                animate={{ y: '0%', height: 'auto' }}
                                exit={{ y: '100%', height: 0 }}
                                transition={{ duration: 0.2 }}
                                className={cn(
                                    'flex origin-bottom items-center justify-start gap-4 bg-black/[0.025] px-3 py-2',
                                    {
                                        'bg-white/5 text-[#fafafa] dark:bg-white/5 dark:text-[#fafafa]':
                                            dark,
                                    },
                                    classNames.driveFooter,
                                )}
                            >
                                <button
                                    className={cn(
                                        'rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-all duration-300',
                                        {
                                            'animate-pulse': showLoader,
                                            'bg-[#30C5F7] dark:bg-[#30C5F7]':
                                                dark,
                                        },
                                        classNames.driveAddFilesButton,
                                    )}
                                    onClick={handleSubmit}
                                    disabled={showLoader}
                                >
                                    Add {selectedFiles.length} file
                                    <ShouldRender if={selectedFiles.length > 1}>
                                        s
                                    </ShouldRender>
                                </button>
                                <button
                                    className={cn(
                                        'ml-auto rounded-md p-1 text-sm text-blue-600 transition-all duration-300',
                                        {
                                            'text-[#30C5F7] dark:text-[#30C5F7]':
                                                dark,
                                        },
                                        classNames.driveCancelFilesButton,
                                    )}
                                    onClick={handleCancelDownload}
                                    disabled={showLoader}
                                >
                                    Cancel
                                </button>
                            </motion.div>
                        </AnimatePresence>
                    </ShouldRender>
                </div>
            </ShouldRender>
        </div>
    )
}
