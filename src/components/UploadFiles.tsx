import React, {useState, DragEvent, FC, useEffect} from 'react';
import FileUploader from './FileUploader/FileUploader';
import {pubObject} from "../lib/putObject";
import {compressFile} from "../lib/compressFile";

export interface UploadFilesProps {
    client: any
    bucket: string
    setKey: (key: string) => void
    canUpload: boolean
}

/**
 *
 * @param client
 * @param bucket
 * @param setKey
 * @param canUpload
 * @constructor
 */

export const UploadFiles: FC<UploadFilesProps>  = ({client,bucket,setKey, canUpload}: UploadFilesProps) => {
    const [dragging, setDragging] = useState<boolean>(false)
    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setDragging(() => true)
    }
    const [files, setFiles] = useState<File[]>([]);
    const handleUpload = async () => {
        const compressedFiles: File[] = [];
        if (files) {
            for (let i = 0; i < files.length; i++) {
                const element = files[i];
                const compressedFile = await compressFile({element,element_name: element.name})
                compressedFiles.push(compressedFile);
            }
        }

        let key = '';
        compressedFiles.forEach(compressedFile => {
            key = `${Date.now()}__${compressedFile.name}`
            pubObject({client, bucket, key, compressedFile})
        })
        setKey(key)
    }
    useEffect(() => {
        if (canUpload) {
            handleUpload()
        }
    }, [canUpload])


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
