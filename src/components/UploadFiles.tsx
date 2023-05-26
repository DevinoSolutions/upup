import React, { useState, DragEvent, FC, useEffect } from 'react';
import FileUploader from './FileUploader/FileUploader';
import { pubObject } from '../lib/putObject';
import { compressFile } from '../lib/compressFile';

export interface UploadFilesProps {
  client: any;
  bucket: string;
  setKey: (key: string) => void;
  canUpload: boolean;
}

/**
 *
 * @param client cloud provider client, ex: S3
 * @param bucket bucket name
 * @param setKey return the final name of the file, usually it has timestamp prefix
 * @param canUpload to control when to upload the file , it has default false value
 * @constructor
 */
export const UploadFiles: FC<UploadFilesProps> = ({
  client,
  bucket,
  setKey,
  canUpload,
}: UploadFilesProps) => {
  const [dragging, setDragging] = useState<boolean>(false);
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(() => true);
  };
  const [files, setFiles] = useState<File[]>([]);
  const handleUpload = async () => {
    const compressedFiles: File[] = [];
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const element = files[i];

        // Read the file content as a Buffer
        const compressedFile = await compressFile({
          element,
          element_name: element.name,
        });

        compressedFiles.push(compressedFile);
      }
    }

    let key = '';
    compressedFiles.forEach((compressedFile) => {
      // assign a unique name for the file, usually has to timestamp prefix
      key = `${Date.now()}__${compressedFile.name}`;

      // upload the file to the cloud
      pubObject({ client, bucket, key, compressedFile });
    });

    // set the file name
    setKey(key);
  };
  useEffect(() => {
    if (canUpload) {
      handleUpload();
    }
  }, [canUpload]);

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
  );
};
