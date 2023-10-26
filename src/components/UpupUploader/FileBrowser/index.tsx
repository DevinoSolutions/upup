import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import type { GoogleFile, Root, User } from 'google'
import ListItem from './ListItem'

import { AnimatePresence, motion } from 'framer-motion'
import { TbSearch } from 'react-icons/tb'

type Props = {
    googleFiles: Root | undefined
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
    googleFiles,
    setFiles,
    downloadFile,
    setView,
    accept,
}: Props) => {
    const [path, setPath] = useState<Root[]>([])
    const [selectedFiles, setSelectedFiles] = useState<GoogleFile[]>([])
    const [showLoader, setLoader] = useState(false);

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
        setLoader(true);
        const downloadedFiles = await downloadFiles(selectedFiles)
        setFiles(prevFiles => [
            ...prevFiles,
            ...(downloadedFiles as unknown as File[]),
        ])
        setView('internal')
        setLoader(false);
    }

    useEffect(() => {
        if (googleFiles) setPath([googleFiles])
    }, [googleFiles])

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
                        {!showLoader && (<button
                            className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium rounded-md p-3 px-5 transition-all duration-300"
                            onClick={handleSubmit}
                        >
                            Add {selectedFiles.length} files
                        </button>)}
                        {showLoader && (<button
                            className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium rounded-md p-3 px-5 transition-all duration-300"
                            disabled
                        >
                            <svg aria-hidden="true" role="status" className="inline mr-0 w-3.5 h-3.5 text-white animate-spin" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB"></path>
                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"></path>
                            </svg>
                            Loading...
                        </button>)}
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
