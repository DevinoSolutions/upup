import React, { SVGProps } from 'react'
import {
    TbFileText,
    TbFileUnknown,
    TbMusic,
    TbPdf,
    TbVideo,
} from 'react-icons/tb'

type IconType = (props: SVGProps<SVGSVGElement>) => JSX.Element

const fileTypes: { [key: string]: IconType } = {
    mp4: TbVideo,
    avi: TbVideo,
    webm: TbVideo,
    mov: TbVideo,
    mkv: TbVideo,
    mp3: TbMusic,
    wav: TbMusic,
    ogg: TbMusic,
    flac: TbMusic,
    pdf: TbPdf,
    txt: TbFileText,
    docx: TbFileText,
    doc: TbFileText,
    odt: TbFileText,
    rtf: TbFileText,
}

type Props = {
    extension?: string
}

const FileIcon = ({ extension = '' }: Props) => {
    const Component = fileTypes[extension] || TbFileUnknown
    return <Component className="h-full w-full" />
}

export default FileIcon
