import React, { DragEvent, FC, useEffect, useState } from 'react';
import FileUploader from './FileUploader/FileUploader';
import { pubObject } from '../lib/putObject';
import { compressFile } from '../lib/compressFile';
import { ICloudStorageConfigs } from '../types/ICloudStorageConfigs';
import { IBaseConfigs } from '../types/IBaseConfigs';

export interface UploadFilesProps {
  client: any;
  cloudStorageConfigs: ICloudStorageConfigs;
  baseConfigs: IBaseConfigs;
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
  client,
  baseConfigs: { setKey, canUpload, toBeCompressed = false },
  cloudStorageConfigs: { bucket },
}: UploadFilesProps) => {
  /**
   * Handle the drag enter event
   */
  const [dragging, setDragging] = useState<boolean>(false);
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(() => true);
  };

  /**
   * Files array
   */
  const [files, setFiles] = useState<File[]>([]);

  /**
   * Upload the file to the cloud storage
   */
  const handleUpload = async () => {
    let filesToUpload: File[];
    let key = '';

    /**
     * Compress the file before uploading it to the cloud storage
     */
    if (toBeCompressed)
      filesToUpload = await Promise.all(
        files.map(async (file) => {
          /**
           * Compress the file
           */
          return await compressFile({ element: file, element_name: file.name });
        })
      );
    else filesToUpload = files;

    /**
     * Loop through the files array and upload the files
     */
    if (filesToUpload) {
      filesToUpload.forEach((fileToUpload) => {
        /**
         * assign a unique name for the file, usually has a timestamp prefix
         */
        key = `${Date.now()}__${fileToUpload.name}`;

        /**
         * Upload the file to the cloud storage
         */
        pubObject({ client, bucket, key, file: fileToUpload });
      });

      // set the file name
      setKey(key);
    }
  };

  /**
   * Upload the file to the cloud storage when canUpload set is true
   */
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
