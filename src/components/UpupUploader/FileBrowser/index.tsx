import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import type { GoogleFile, Root, User } from 'google'
import ListItem from './ListItem'

import { AnimatePresence, motion } from 'framer-motion'
import { TbSearch } from 'react-icons/tb'
import { MicrosoftUser, OneDriveRoot } from 'microsoft'

type Props = {
    driveFiles?: Root | OneDriveRoot | undefined
    handleSignOut: () => void
    user: User | MicrosoftUser | undefined
    downloadFile?: (fileId: string) => Promise<Blob>
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
        const downloadedFiles = await downloadFiles(selectedFiles)
        setFiles(prevFiles => [
            ...prevFiles,
            ...(downloadedFiles as unknown as File[]),
        ])
        setView('internal')
    }

    useEffect(() => {
        if (driveFiles) setPath([driveFiles])
    }, [driveFiles])

    return (
        <div className="w-full grid grid-rows-[auto,auto,1fr,auto] bg-white h-[min(98svh,32rem)] ">
            <div className="h-12 bg-[#fafafa] text-[#333] border-b flex justify-between items-center p-2 text-xs font-medium dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                <div className="h p-2 px-4 flex gap-1">
                    {path &&
                        path.map((p, i) => (
                            <p
                                key={p.id}
                                className={
                                    'cursor-pointer group flex gap-1 truncate ' +
                                    (i === path.length - 1
                                        ? 'pointer-events-none'
                                        : '')
                                }
                                onClick={() =>
                                    setPath(prev => prev.slice(0, i + 1))
                                }
                            >
                                <span className="group-hover:underline">
                                    {p.name}
                                </span>
                                {i !== path.length - 1 && ' > '}
                            </p>
                        ))}
                </div>
                <div className="flex gap-2 items-center">
                    <h1>{user ? user.name : ''}</h1>
                    <i className="h-[3px] w-[3px] rounded-full bg-[#ddd] -mb-1" />
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

            <div className="bg-white p-2 relative  dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                <input
                    type="search"
                    className="w-full h-8 bg-[#eaeaea] rounded-md text-xs px-2 pl-8 outline-none focus:bg-[#cfcfcf] transition-all duration-300 dark:bg-[#2f2f2f] dark:text-[#fafafa]"
                    placeholder="Search"
                />
                <TbSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939393]" />
            </div>

            <div className="bg-white h-full overflow-y-scroll pt-2 overflow-scroll dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                <ul className="p-2">
                    {path &&
                        path[path.length - 1]?.children?.map((file, index) => {
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
            </div>

            <AnimatePresence>
                {selectedFiles.length > 0 && (
                    <motion.div
                        initial={{ y: '100%', height: 0 }}
                        animate={{ y: '0%', height: 'auto' }}
                        exit={{ y: '100%', height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t bg-white flex items-center justify-start gap-4 p-4 py-2 origin-bottom dark:bg-[#1f1f1f] dark:text-[#fafafa]"
                    >
                        <button
                            className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium rounded-md p-3 px-5 transition-all duration-300"
                            onClick={handleSubmit}
                        >
                            Add {selectedFiles.length} files
                        </button>
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
