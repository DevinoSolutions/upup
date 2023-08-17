import { motion } from 'framer-motion'
import React from 'react'
import { TbFolder, TbSearch } from 'react-icons/tb'

const FileBrowser = ({}: {}) => {
    const [currentFolder, setCurrentFolder] = React.useState(data)
    const [selectedFiles, setSelectedFiles] = React.useState<any[]>([])

    const handleClick = (file: any) => {
        if (file.children) setCurrentFolder(file)
        else {
            if (selectedFiles.includes(file.id))
                setSelectedFiles(prev => prev.filter(id => id !== file.id))
            else setSelectedFiles(prev => [...prev, file.id])
        }
    }

    return (
        <div className="h-full w-full grid grid-rows-[auto,auto,1fr]">
            <div className="h-12 bg-[#fafafa] text-[#333] border-b flex justify-between items-center p-2 text-xs font-medium dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                <h1 className="hover:bg-[#e9ecef] active:bg-[#dfe6f1] rounded-md p-2 px-4 transition-all duration-300">
                    Google Drive
                </h1>
                <div className="flex gap-2 items-center">
                    <h1>bechir@unotes.com</h1>
                    <i className="h-[3px] w-[3px] rounded-full bg-[#ddd] -mb-1" />
                    <button className="text-[#2275d7] hover:underline">
                        Log out
                    </button>
                </div>
            </div>

            <div className="bg-white p-2 relative">
                <input
                    type="search"
                    className="w-full h-8 bg-[#eaeaea] rounded-md text-xs px-2 pl-8 outline-none focus:bg-[#cfcfcf] transition-all duration-300"
                    placeholder="Search"
                />
                <TbSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#939393]" />
            </div>

            <div className="bg-white h-full overflow-y-scroll pt-2">
                <ul className="p-2">
                    {currentFolder?.children.map((file, i) => (
                        <motion.li
                            key={file.id}
                            initial={{
                                opacity: 0,
                                y: -10,
                                backgroundColor: selectedFiles.includes(file.id)
                                    ? '#e9ecef99'
                                    : '#e9ecef00',
                            }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ backgroundColor: '#e9ecef' }}
                            whileTap={{ backgroundColor: '#dfe6f1' }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{
                                duration: 0.2,
                                delay: i * 0.05,
                                backgroundColor: { duration: 0.2, delay: 0 },
                            }}
                            className={
                                'flex items-center justify-between gap-2 mb-1 cursor-pointer rounded-md py-2 p-1 ' +
                                (file.children ? ' font-medium' : '')
                            }
                            onClick={() => handleClick(file)}
                        >
                            <div className="flex items-center gap-2">
                                <i className="text-lg">
                                    {file.children ? (
                                        <TbFolder />
                                    ) : (
                                        <img
                                            src={file.url}
                                            alt={file.name}
                                            className="w-5 h-5 rounded-md"
                                        />
                                    )}
                                </i>
                                <h1 className="text-xs">{file.name}</h1>
                            </div>
                        </motion.li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

export default FileBrowser
