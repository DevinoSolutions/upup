import React, {useState, DragEvent, FC, useEffect} from 'react';
import FileUploader from './FileUploader/FileUploader';
import pako from 'pako'

export interface UploadFilesProps {
    client: any
    bucket: string
    setKey: (key: string) => void
    canUpload: boolean
}

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
                const buffer: ArrayBuffer = await element.arrayBuffer();
                const compressedFile = new File(
                    [pako.gzip(buffer)],
                    element.name + ".gz",
                    {
                        type: "application/octet-stream"
                    }
                );
                compressedFiles.push(compressedFile);
            }
        }

        let key = '';
        compressedFiles.forEach(element => {
            key = `${Date.now()}__${element.name}`
            client.putObject(
                {
                    Bucket: bucket,
                    Key: `${key}`,
                    Body: element,
                    ACL: 'public-read',
                },
                (err:any, _data:any) => {
                    if (err) console.log(err, err.stack)
                }
            )
        })
        console.log('key', key)
        setKey(key)

    }
    useEffect(() => {
        if (canUpload) {
            handleUpload()
        }
    }, [canUpload])


    return (
        <div
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
