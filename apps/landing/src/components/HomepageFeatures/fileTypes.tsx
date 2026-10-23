import { FaFileAlt, FaImage, FaVideo, FaMusic } from 'react-icons/fa'
import { SiJavascript } from 'react-icons/si'
import { ImFileZip } from 'react-icons/im'

export const fileTypes = [
    {
        icon: <FaImage className="w-8 h-8" />,
        label: 'Images',
        types: 'JPG, PNG, GIF, WebP',
    },
    {
        icon: <FaFileAlt className="w-8 h-8" />,
        label: 'Documents',
        types: 'PDF, DOC, DOCX, TXT',
    },
    {
        icon: <FaVideo className="w-8 h-8" />,
        label: 'Videos',
        types: 'MP4, AVI, MOV, WebM',
    },
    {
        icon: <FaMusic className="w-8 h-8" />,
        label: 'Audio',
        types: 'MP3, WAV, OGG, FLAC',
    },
    {
        icon: <ImFileZip className="w-8 h-8" />,
        label: 'Archives',
        types: 'ZIP, RAR, 7Z, TAR',
    },
    {
        icon: <SiJavascript className="w-8 h-8" aria-hidden />,
        label: 'Code',
        types: 'JS, TS, JSON, XML',
    },
]
