import { Dispatch, SetStateAction } from 'react'

export interface FileWithId extends File {
    id?: string
}

export interface PreviewProps {
    file: FileWithId
    objectUrl: string
}

export interface FileHandlerProps {
    files: FileWithId[]
    setFiles: Dispatch<SetStateAction<FileWithId[]>>
}
