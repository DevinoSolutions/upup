import { motion } from 'framer-motion'
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
import AdapterViewContainer from './AdapterViewContainer'
import DriveBrowserHeader from './DriveBrowserHeader'
import DriveBrowserItem from './DriveBrowserItem'
import MyAnimatePresence from './MyAnimatePresence'
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
}: Readonly<Props>) {
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
        <AdapterViewContainer isLoading={isLoading}>
            <ShouldRender if={true} isLoading={isLoading}>
                <div className="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr,auto] upup-overflow-auto">
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
                                'upup-h-full upup-overflow-y-scroll upup-bg-black/[0.075] upup-pt-2',
                                {
                                    'upup-bg-white/10 upup-text-[#fafafa] dark:upup-bg-white/10 dark:upup-text-[#fafafa]':
                                        dark,
                                },
                                classNames.driveBody,
                            )}
                        >
                            <ShouldRender if={!!displayedItems.length}>
                                <ul className="upup-p-2">
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
                                <div className="upup-flex upup-h-full upup-flex-col upup-items-center upup-justify-center">
                                    <p className="upup-text-xs upup-opacity-70">
                                        No accepted files found
                                    </p>
                                </div>
                            </ShouldRender>
                        </div>
                    </ShouldRender>

                    <ShouldRender if={!!selectedFiles.length}>
                        <MyAnimatePresence>
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
                                    classNames.driveFooter,
                                )}
                            >
                                <button
                                    className={cn(
                                        'upup-rounded-md upup-bg-blue-600 upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-white upup-transition-all upup-duration-300',
                                        {
                                            'upup-animate-pulse': showLoader,
                                            'upup-bg-[#30C5F7] dark:upup-bg-[#30C5F7]':
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
                                        'upup-ml-auto upup-rounded-md upup-p-1 upup-text-sm upup-text-blue-600 upup-transition-all upup-duration-300',
                                        {
                                            'upup-text-[#30C5F7] dark:upup-text-[#30C5F7]':
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
                        </MyAnimatePresence>
                    </ShouldRender>
                </div>
            </ShouldRender>
        </AdapterViewContainer>
    )
}
