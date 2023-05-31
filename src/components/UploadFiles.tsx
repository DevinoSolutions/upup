import React, { DragEvent, FC, useEffect, useState } from 'react';
import FileUploader from './FileUploader/FileUploader';
import { pubObject } from '../lib/putObject';
import { compressFile } from '../lib/compressFile';
import { CloudStorageConfigs } from '../types/CloudStorageConfigs';
import { BaseConfigs } from '../types/BaseConfigs';

export interface UploadFilesProps {
  cloudStorageConfigs: CloudStorageConfigs;
  baseConfigs: BaseConfigs;
}

/**
 *
 * @param client cloud provider client, ex: S3
 * @param bucket bucket name
 * @param setKey return the final name of the file, usually it has timestamp prefix
 * @param canUpload to control when to upload the file , it has default false value
 * @param toBeCompressed whether the user want to compress the file before uploading it or not. Default value is false
 * @constructor
 */
export const UploadFiles: FC<UploadFilesProps> = ({
  baseConfigs: { setKey, canUpload, toBeCompressed = false },
  cloudStorageConfigs: { client, bucket },
}: UploadFilesProps) => {
  const [dragging, setDragging] = useState<boolean>(false);
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(() => true);
  };
  const [files, setFiles] = useState<File[]>([]);
  const handleUpload = async () => {
    let filesToUpload: File[];
    let key = '';

    if (toBeCompressed)
      filesToUpload = await Promise.all(
        files.map(async (file) => {
          return await compressFile({ element: file, element_name: file.name });
        })
      );
    else filesToUpload = files;

    if (filesToUpload) {
      filesToUpload.forEach((fileToUpload) => {
        // assign a unique name for the file, usually has to timestamp prefix
        key = `${Date.now()}__${fileToUpload.name}`;

        // upload the file to the cloud
        pubObject({ client, bucket, key, file: fileToUpload });
      });

      // set the file name
      setKey(key);
    }
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
