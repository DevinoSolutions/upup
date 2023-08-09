import React from 'react'
import { Dispatch, SetStateAction } from 'react'
import { ImCross } from 'react-icons/im'
import { bytesToSize } from '../../lib/bytesToSize'
import styled from 'styled-components'

const FileItemContainer = styled.div`
    display: flex;
    align-items: center;
    padding: 8px;
    font-family: 'Poppins', sans-serif;
    gap: 2rem;
    position: relative;
    justify-content: space-between;
`

const FileType = styled.div`
    height: 3rem;
    width: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
    background-color: #9c1f2b;
    color: #ffffff;
    aspect-ratio: 1/1;
    border-radius: 50%;
`

const FileInfoContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: hidden;
    flex: 1;
`

const FileName = styled.h1`
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    font-size: 14px;
`

const FileSize = styled.h2`
    font-size: 10px;
    font-weight: bold;
    color: #737373;
`

const CloseIcon = styled(ImCross)`
    font-size: 12px;
    width: 12px;
    height: 12px;
    cursor: pointer;
    opacity: 0.8;
`

type Props = {
    file: File
    setFiles: Dispatch<SetStateAction<File[]>>
}
/**
 *
 * @param file
 * @param setFiles
 * @constructor
 */
const FileItem = ({ file, setFiles }: Props) => {
    /**
     * Get file type
     * @param file
     */
    const getFileType = (file: File) => file.type.split('/')[1]

    return (
        <FileItemContainer>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2rem',
                    overflow: 'hidden',
                }}
            >
                <FileType>{getFileType(file)}</FileType>
                <FileInfoContainer>
                    <FileName title={file.name}>{file.name}</FileName>
                    <FileSize>{bytesToSize(file.size)}</FileSize>
                </FileInfoContainer>
            </div>
            <CloseIcon
                onClick={() =>
                    setFiles(prev => prev.filter(f => f.name !== file.name))
                }
            />
        </FileItemContainer>
    )
}

export default FileItem
