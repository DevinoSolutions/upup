import React, { DragEvent, FC, useState } from 'react'
import FileUploader from './FileUploader/FileUploader'
import styled from 'styled-components'

const UploadFilesContainer = styled.div`
    max-width: 100%;
    overflow: hidden;
    display: flex;
    width: 100%;
`

export interface Props {
    files: File[]
    setFiles: React.Dispatch<React.SetStateAction<File[]>>
    multiple?: boolean
}

/**
 *
 * @param bucket bucket name
 * @param multiple whether the user want to upload multiple files or not. Default value is false
 * */
export const InternalUploader: FC<Props> = ({
    setFiles,
    files,
    multiple,
}: Props) => {
    /**
     * Handle the drag enter event
     */
    const [dragging, setDragging] = useState<boolean>(false)
    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setDragging(() => true)
    }

    return (
        <UploadFilesContainer onDragEnter={handleDragEnter}>
            <FileUploader
                dragging={dragging}
                setDragging={setDragging}
                files={files}
                setFiles={setFiles}
                multiple={multiple}
            />
        </UploadFilesContainer>
    )
}
