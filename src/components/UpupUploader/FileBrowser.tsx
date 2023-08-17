import { motion } from 'framer-motion'
import React from 'react'
import {
    TbFileText,
    TbFileUnknown,
    TbFolder,
    TbMusic,
    TbPdf,
    TbSearch,
    TbVideo,
} from 'react-icons/tb'

const FileBrowser = ({}: {}) => {
    1
    const [path, setPath] = React.useState<any[]>([data])
    const [selectedFiles, setSelectedFiles] = React.useState<any[]>([])

    const handleClick = (file: any) => {
        if (file.children) setPath(p => [...p, file])
        else {
            if (selectedFiles.includes(file.id))
                setSelectedFiles(prev => prev.filter(id => id !== file.id))
            else setSelectedFiles(prev => [...prev, file.id])
        }
    }

    return (
        <div className="h-full w-full grid grid-rows-[auto,auto,1fr]">
            <div className="h-12 bg-[#fafafa] text-[#333] border-b flex justify-between items-center p-2 text-xs font-medium dark:bg-[#1f1f1f] dark:text-[#fafafa]">
                <div className="h p-2 px-4 flex gap-1">
                    {path.map((p, i) => (
                        <p
                            key={p.id}
                            className="cursor-pointer group flex gap-1 truncate"
                            onClick={() =>
                                setPath(prev => prev.slice(0, i + 1))
                            }
                        >
                            {' '}
                            <span className="group-hover:underline">
                                {p.name}
                            </span>
                            {i !== path.length - 1 && ' > '}
                        </p>
                    ))}
                </div>
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
                    {path[path.length - 1]?.children.map(
                        (file: any, i: number) => (
                            <motion.li
                                key={file.id}
                                initial={{
                                    opacity: 0,
                                    y: -10,
                                    backgroundColor: selectedFiles.includes(
                                        file.id,
                                    )
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
                                    backgroundColor: {
                                        duration: 0.2,
                                        delay: 0,
                                    },
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
                                        ) : // check if file is image
                                        /\.(jpe?g|png|gif|bmp|webp)$/i.test(
                                              file.name,
                                          ) ? (
                                            <img
                                                src={file.url}
                                                alt={file.name}
                                                className="w-5 h-5 rounded-md"
                                            />
                                        ) : // check if file is video
                                        /\.(mp4|avi|webm|mov|mkv)$/i.test(
                                              file.name,
                                          ) ? (
                                            <TbVideo />
                                        ) : // check if file is audio
                                        /\.(mp3|wav|ogg|flac)$/i.test(
                                              file.name,
                                          ) ? (
                                            <TbMusic />
                                        ) : // check if file is pdf
                                        /\.(pdf)$/i.test(file.name) ? (
                                            <TbPdf />
                                        ) : // check if file is text
                                        /\.(txt|docx|doc|odt|rtf)$/i.test(
                                              file.name,
                                          ) ? (
                                            <TbFileText />
                                        ) : (
                                            // default
                                            <TbFileUnknown />
                                        )}
                                    </i>
                                    <h1 className="text-xs">{file.name}</h1>
                                </div>
                            </motion.li>
                        ),
                    )}
                </ul>
            </div>
        </div>
    )
}

export default FileBrowser

// mock data
const data = {
    id: 'gdrive',
    name: 'Google Drive',
    url: null,
    children: [
        {
            id: '1',
            name: 'Personal',
            url: null,
            children: [
                {
                    id: '1.1',
                    name: 'Photos',
                    url: null,
                    children: [
                        {
                            id: '1.1.1',
                            name: 'Vacation.jpg',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '1.1.2',
                            name: 'Birthday.png',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '1.1.3',
                            name: 'Wedding.gif',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                    ],
                },
                {
                    id: '1.2',
                    name: 'Documents',
                    url: null,
                    children: [
                        {
                            id: '1.2.1',
                            name: 'Resume.pdf',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '1.2.2',
                            name: 'Cover Letter.docx',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '1.2.3',
                            name: 'Report.xlsx',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                    ],
                },
                {
                    id: '1.3',
                    name: 'Music',
                    url: null,
                    children: [
                        {
                            id: '1.3.1',
                            name: 'Favorite Songs.mp3',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '1.3.2',
                            name: 'Podcast Episodes.m4a',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '1.3.3',
                            name: 'Playlist.txt',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                    ],
                },
                {
                    id: '1.1.1a',
                    name: 'meme.webp',
                    url: 'https://picsum.photos/200/300',
                    children: null,
                },
                {
                    id: '1.1.1b',
                    name: 'New Text File (2).txt',
                    url: 'https://picsum.photos/200/300',
                    children: null,
                },
                {
                    id: '1.1.1c',
                    name: 'New Text File (2).txt',
                    url: 'https://picsum.photos/200/300',
                    children: null,
                },
            ],
        },
        {
            id: '2',
            name: 'Work',
            url: null,
            children: [
                {
                    id: '2.1',
                    name: 'Projects',
                    url: null,
                    children: [
                        {
                            id: '2.1.1',
                            name: 'Website Design.psd',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '2.1.2',
                            name: 'App Development.js',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '2.1.3',
                            name: 'Database Schema.sql',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                    ],
                },
                {
                    id: '2.2',
                    name: 'Meetings',
                    url: null,
                    children: [
                        {
                            id: '2.2.1',
                            name: 'Agenda.docx',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '2.2.2',
                            name: 'Minutes.pdf',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '2.2.3',
                            name: 'Presentation.pptx',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                    ],
                },
                {
                    id: '2.3',
                    name: 'Invoices',
                    url: null,
                    children: [
                        {
                            id: '2.3.1',
                            name: 'January.pdf',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '2.3.2',
                            name: 'February.pdf',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '2.3.3',
                            name: 'March.pdf',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                    ],
                },
            ],
        },
        {
            id: '3',
            name: 'Shared',
            url: null,
            children: [
                {
                    id: '3.1',
                    name: 'Family',
                    url: null,
                    children: [
                        {
                            id: '3.1.1',
                            name: 'Genealogy.pdf',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '3.1.2',
                            name: 'Recipes.docx',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '3.1.3',
                            name: 'Calendar.xlsx',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                    ],
                },
                {
                    id: '3.2',
                    name: 'Friends',
                    url: null,
                    children: [
                        {
                            id: '3.2.1',
                            name: 'Movie List.txt',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '3.2.2',
                            name: 'Party Invitation.jpg',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '3.2.3',
                            name: 'Travel Plan.pdf',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                    ],
                },
                {
                    id: '3.3',
                    name: 'School',
                    url: null,
                    children: [
                        {
                            id: '3.3.1',
                            name: 'Homework.zip',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '3.3.2',
                            name: 'Essay.docx',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                        {
                            id: '3.3.3',
                            name: 'Quiz.pdf',
                            url: 'https://picsum.photos/200/300',
                            children: null,
                        },
                    ],
                },
            ],
        },
    ],
}
