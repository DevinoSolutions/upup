import { AnimatePresence, motion } from 'framer-motion'
import { GoogleFile, Root, User } from 'google'
import { MicrosoftUser, OneDriveFile, OneDriveRoot } from 'microsoft'
import React, { Dispatch, SetStateAction, useEffect } from 'react'
import { useRootContext } from '../../context/RootContext'
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

    useEffect(() => {
        if (driveFiles) setPath([driveFiles as any])
    }, [driveFiles])

    return (
        <ShouldRender if={true} isLoading={isClickLoading || !driveFiles}>
            <div className="grid h-full w-full grid-rows-[auto,1fr,auto] overflow-auto bg-white ">
                <DriveBrowserHeader path={path} setPath={setPath} {...rest} />

                <div className="h-full overflow-scroll overflow-y-scroll bg-white pt-2 dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                    <ShouldRender if={!!path}>
                        {path[path.length - 1]?.children.length ? (
                            <ul className="p-2">
                                {(
                                    path[path.length - 1].children as Array<any>
                                ).map((file, index) => {
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
                    </ShouldRender>
                </div>

                <ShouldRender if={selectedFiles.length > 0}>
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
                                className="ml-auto text-sm hover:underline"
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
