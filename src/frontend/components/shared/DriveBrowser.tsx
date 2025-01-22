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
    downloadProgress,
    handleCancelDownload,
    ...rest
}: Props) {
    const {
        props: { accept },
    } = useRootContext()
    const [searchTerm, setSearchTerm] = useState('')
    const items = (path[path.length - 1]?.children as Array<any>).filter(item =>
        filterItems(item, accept),
    )
    const displayedItems = useMemo(
        () => searchDriveFiles<any>(items, searchTerm) || [],
        [searchTerm, items],
    )

    useEffect(() => {
        if (driveFiles) setPath([driveFiles as any])
    }, [driveFiles])

    return (
        <ShouldRender if={true} isLoading={isClickLoading || !driveFiles}>
            <div
                className={`grid h-full w-full grid-rows-[auto,1fr,auto] overflow-auto bg-white`}
            >
                <DriveBrowserHeader
                    showSearch={!!items?.length}
                    path={path}
                    setPath={setPath}
                    searchTerm={searchTerm}
                    onSearch={setSearchTerm}
                    {...rest}
                />
                <ShouldRender if={!!path}>
                    <div className="h-full overflow-scroll overflow-y-scroll bg-[#f4f4f4] pt-2 dark:bg-[#1f1f1f] dark:text-[#fafafa]">
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
                            className="flex origin-bottom items-center justify-start gap-4 border-t border-[#e0e0e0] bg-[#fafafa] px-3 py-2 dark:bg-[#1f1f1f] dark:text-[#fafafa]"
                        >
                            <button
                                className={`rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-blue-600 active:bg-blue-700 ${
                                    showLoader ? 'animate-pulse' : ''
                                }`}
                                onClick={handleSubmit}
                                disabled={showLoader}
                            >
                                Add {selectedFiles.length} file
                                {selectedFiles.length > 1 ? 's' : ''}
                            </button>
                            <button
                                className="ml-auto rounded-md p-1 text-sm text-[#1b5dab] transition-all duration-300 dark:text-[#fafafa]"
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
    )
}
