import React, {useState, DragEvent} from 'react';
import FileUploader from './FileUploader/FileUploader';

export function UploadFiles() {
    const [dragging, setDragging] = useState<boolean>(false)
    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setDragging(() => true)
    }
    const [files, setFiles] = useState<File[]>([]);


    return (
        <div
            className="flex justify-center h-full items-center relative"
            onDragEnter={handleDragEnter}
        >
            <FileUploader
                dragging={dragging}
                setDragging={setDragging}
                files={files}
                setFiles={setFiles}
                multiple={false}
            />

        </div>
    )
}
