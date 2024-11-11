import BrowserPath from 'components/BrowserPath'
import ButtonSpinner from 'components/ButtonSpinner'
import OneDriveItem from 'components/OneDriveItem'
import RenderWithLoading from 'components/RenderWithLoading'
import ShouldRender from 'components/ShouldRender'
import { AnimatePresence, motion } from 'framer-motion'
import useOneDrive from 'hooks/useOneDrive'
import useOneDriveBrowser from 'hooks/useOneDriveBrowser'
import { memo } from 'react'
import { TbSearch } from 'react-icons/tb'
import { MicrosoftUser } from 'types'

export default memo(function OneDriveUploader() {
    const { user, oneDriveFiles, signOut, graphClient } = useOneDrive()
    const {
        path,
        setPath,
        selectedFiles,
        setSelectedFiles,
        handleClick,
        handleSubmit,
        showLoader,
        downloadProgress,
        setDownloadProgress,
        folderLoading,
        fileSelecting,
    } = useOneDriveBrowser({
        oneDriveFiles,
        graphClient,
    })

    return (
        <RenderWithLoading isLoading={!oneDriveFiles}>
            <div className="grid h-[min(98svh,32rem)] w-full grid-rows-[auto,auto,1fr,auto] bg-white ">
                <div className="grid h-12 grid-cols-[minmax(0,1fr),auto] border-b bg-[#fafafa] p-2 text-xs font-medium text-[#333] dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                    <BrowserPath path={path} setPath={setPath} />
                    <div className="flex items-center gap-2">
                        <ShouldRender if={!!user}>
                            <h1>{(user as MicrosoftUser)?.name}</h1>
                        </ShouldRender>
                        <i className="-mb-1 h-[3px] w-[3px] rounded-full bg-[#ddd]" />
                        <ShouldRender if={!!user}>
                            <button
                                className="text-[#2275d7] hover:underline"
                                onClick={signOut}
                            >
                                Log out
                            </button>
                        </ShouldRender>
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
                    <ShouldRender if={!!path.at(-1)?.children.length}>
                        <ul className="p-2">
                            {path.at(-1)?.children?.map(file => {
                                return (
                                    <OneDriveItem
                                        key={file.id}
                                        file={file}
                                        handleClick={handleClick}
                                        selectedFiles={selectedFiles}
                                        folderLoading={folderLoading}
                                        fileSelecting={fileSelecting}
                                    />
                                )
                            })}
                        </ul>
                    </ShouldRender>
                    <ShouldRender if={!path.at(-1)?.children.length}>
                        <div className="flex h-full flex-col items-center justify-center">
                            <h1 className="text-sm">No files found</h1>
                        </div>
                    </ShouldRender>
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
        </RenderWithLoading>
    )
})
