import FileItem from './FileItem'
import React, { Dispatch, DragEvent, SetStateAction } from 'react'
import styled from 'styled-components'

const StyledFileUploader = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    z-index: 50;
    width: 100%;
`

const DragOverlay = styled.div`
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    background-color: rgba(0, 0, 0, 0.8);
`

const UploadInput = styled.input`
    width: 100%;
    pointer-events: auto;
    cursor: pointer;
    position: absolute;
    max-width: 100%;
    height: 100%;
    opacity: 0;
    top: 0;
    left: 0;
`

const FileUploaderLabel = styled.label`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 16rem;
    border: 2px dashed #ccc;
    border-radius: 8px;
    cursor: pointer;
    background-color: rgba(248, 248, 248, 0.8);

    position: relative;
    z-index: 1;

    &:hover {
        background-color: #e2e8f0;
    }
`

const ScrollerContainer = styled.div`
    width: 100%;
    max-height: 10rem;
    padding: 8px 4px;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    background-color: #f0f4f8;
    border-radius: 20px;
    opacity: 0.6;
    overflow-y: auto;
    background-opacity: 0.6;
    overflow: hidden;
`

const EmptyMessage = styled.h1`
    text-align: center;
    color: #9ca3af;
    font-size: 1rem;
`

const FileItemContainer = styled.div`
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    background-color: rgba(255, 255, 255, 0);
    border: none;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    border-radius: 8px;
`

const StyledParagraph = styled.p`
    margin-bottom: 2px;
    font-size: 0.875rem;
    color: #6b7280;
`

const StyledSpan = styled.span`
    font-weight: 600;
`

const StyledSmallParagraph = styled.p`
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 2px;
`

const StyledSvg = styled.svg`
    width: 2.5rem;
    height: 2.5rem;
    margin-bottom: 0.75rem;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2;
    color: #9ca3af;
    position: relative;
    z-index: 1;
`
const StyledCenteredDiv = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
`

type Props = {
    files: File[]
    setFiles: Dispatch<SetStateAction<File[]>>
    dragging?: boolean
    multiple?: boolean
    setDragging?: (value: boolean) => void
}

/**
 *
 * @param files
 * @param setFiles
 * @param dragging
 * @param setDragging
 * @param multiple
 * @constructor
 */
const FileUploader = ({
    files,
    setFiles,
    dragging,
    setDragging,
    multiple = true,
}: Props) => {
    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        if (setDragging) setDragging(false)

        const fileList = e.dataTransfer.files
            ? Array.from(e.dataTransfer.files)
            : []
        if (fileList.length === 0) return
        if (!multiple) {
            setFiles([fileList[0]])
        } else setFiles([...files, ...fileList])
    }
    const handleDragLeave = () => {
        if (setDragging) setDragging(false)
    }

    const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files ? Array.from(e.target.files) : []
        if (fileList.length === 0) return
        if (!multiple) {
            setFiles([fileList[0]])
        } else setFiles([...files, ...fileList])
        e.target.value = ''
    }
    return (
        <StyledFileUploader>
            {dragging && (
                <DragOverlay>
                    <UploadInput
                        onDrop={handleDrop}
                        onDragLeave={handleDragLeave}
                        id="dropzone-files"
                        type="file"
                        multiple={multiple}
                        onChange={onUpload}
                    />
                </DragOverlay>
            )}
            <StyledCenteredDiv>
                <FileUploaderLabel htmlFor="dropzone-file">
                    <FileItemContainer>
                        <StyledSvg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            ></path>
                        </StyledSvg>

                        <StyledParagraph>
                            <StyledSpan>Click to upload</StyledSpan>
                        </StyledParagraph>

                        <StyledSmallParagraph>
                            or drag and drop PDF, DOC, DOCX OR TXT (MAX. 10MB)
                        </StyledSmallParagraph>
                    </FileItemContainer>

                    <UploadInput
                        id="dropzone-file"
                        type="file"
                        multiple={multiple}
                        onChange={onUpload}
                    />
                </FileUploaderLabel>
            </StyledCenteredDiv>

            <ScrollerContainer>
                {files && files.length > 0 ? (
                    files.map((f, key) => (
                        <FileItem setFiles={setFiles} key={key} file={f} />
                    ))
                ) : (
                    <EmptyMessage>No files</EmptyMessage>
                )}
            </ScrollerContainer>
        </StyledFileUploader>
    )
}

export default FileUploader
