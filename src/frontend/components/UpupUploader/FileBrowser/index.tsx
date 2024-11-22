import type { GoogleFile, Root, User } from 'google'
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import ListItem from '../../UpupUploader/FileBrowser/ListItem'

import { AnimatePresence, motion } from 'framer-motion'
import { TbSearch } from 'react-icons/tb'
import ButtonSpinner from '../../ButtonSpinner'

type Props = {
    driveFiles?: Root | undefined
    handleSignOut: () => void
    user: User | undefined
    downloadFile: (fileId: string) => Promise<Blob>
    setFiles: Dispatch<SetStateAction<File[]>>
    setView: (view: string) => void
    accept?: string
}

const FileBrowser = ({
    handleSignOut,
    user,
    driveFiles,
    setFiles,
    downloadFile,
    setView,
    accept,
}: Props) => {
    const [path, setPath] = useState<Root[]>([])
    const [selectedFiles, setSelectedFiles] = useState<GoogleFile[]>([])
    const [showLoader, setLoader] = useState(false)

    const handleClick = (file: GoogleFile | Root) => {
        if ('children' in file) {
            setPath(prevPath => [...prevPath, file as Root])
        } else {
            setSelectedFiles(prevFiles =>
                prevFiles.includes(file)
                    ? prevFiles.filter(f => f.id !== file.id)
                    : [...prevFiles, file],
            )
        }
    }

    const downloadFiles = async (files: GoogleFile[]) => {
        const promises = files.map(async file => {
            const data = await downloadFile(file.id)
            const downloadedFile = new File([data], file.name, {
                type: file.mimeType,
            }) as unknown as GoogleFile

            downloadedFile['thumbnailLink'] = file.thumbnailLink
            return downloadedFile
        })

        return await Promise.all(promises)
    }

    const handleSubmit = async () => {
        setLoader(true)
        const downloadedFiles = await downloadFiles(selectedFiles)
        setFiles(prevFiles => [
            ...prevFiles,
            ...(downloadedFiles as unknown as File[]),
        ])
        setView('internal')
        setLoader(false)
    }

    useEffect(() => {
        setPath(() => (driveFiles ? [driveFiles] : []))
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
                        {!showLoader && (
                            <button
                                className="w-32 rounded-md bg-blue-500 p-3 font-medium text-white transition-all duration-300 hover:bg-blue-600 active:bg-blue-700"
                                onClick={handleSubmit}
                            >
                                Add {selectedFiles.length} files
                            </button>
                        )}
                        {showLoader && <ButtonSpinner />}
                        <button
                            className="hover:underline"
                            onClick={() => setSelectedFiles([])}
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
