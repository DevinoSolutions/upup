import React, {useState, DragEvent, FC} from 'react';
import FileUploader from './FileUploader/FileUploader';
import pako from 'pako'

export interface UploadFilesProps {
    client: any
    bucket: string
}

export const UploadFiles: FC<UploadFilesProps>  = ({client,bucket}: UploadFilesProps) => {
    const [dragging, setDragging] = useState<boolean>(false)
    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setDragging(() => true)
    }
    const [files, setFiles] = useState<File[]>([]);
    const handleUpload = async () => {
        const formData = new FormData();
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
                formData.append("file", compressedFile);
            }
        }

        let key = '';
        files.forEach(element => {
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
    }
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
            <button
                className="bg-primary text-white px-4 py-2 rounded-md"
                onClick={handleUpload}

            >
                Upload
            </button>
        </div>
    )
}
