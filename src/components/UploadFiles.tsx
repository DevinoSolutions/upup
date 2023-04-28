import React, {useState, DragEvent, FC} from 'react';
import FileUploader from './FileUploader/FileUploader';

export interface UploadFilesProps {
    children?: React.ReactNode;
}

export const  UploadFiles: FC<UploadFilesProps> = () =>  {
    const [dragging, setDragging] = useState<boolean>(false)
    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setDragging(() => true)
    }
    const [files, setFiles] = useState<File[]>([]);


    return (
        <div
            className="max-w-full overflow-hidden flex w-full"
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
