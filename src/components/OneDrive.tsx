import React, { FC, useEffect, useState } from 'react';
import useLoadOdAPI from '../hooks/useLoadOdAPI';
import { IBaseConfigs } from '../types/IBaseConfigs';
import { IOneDriveConfigs } from '../types/IOneDriveConfigs';
import { compressFile } from '../lib/compressFile';
import { putObject } from '../lib/putObject';
import { ICloudStorageConfigs } from '../types/ICloudStorageConfigs';

interface OneDriveParams {
  client: any;
  cloudStorageConfigs: ICloudStorageConfigs;
  baseConfigs: IBaseConfigs;
  oneDriveConfigs: IOneDriveConfigs | undefined;
}

/**
 * One Drive component
 * @param client s3 client
 * @param bucket s3 bucket
 * @param setKey return the final name of the file, usually it has timestamp prefix
 * @param toBeCompressed whether the user want to compress the file before uploading it or not. Default value is false
 * @param oneDriveConfigs one drive configs
 * @constructor
 */
const OneDrive: FC<OneDriveParams> = ({
  client,
  cloudStorageConfigs: { bucket },
  baseConfigs: { setKey, toBeCompressed },
  oneDriveConfigs,
}: OneDriveParams) => {
  const [files, setFiles] = useState<File[]>([]);

  const { isLoaded } = useLoadOdAPI();

  /**
   * Upload the file to the cloud storage when the files array is updated
   */
  useEffect(() => {
    files.map((file) => {
      const key = `${Date.now()}__${file.name}`;
      putObject({ client, bucket, key, file });
      setKey([key]);
    });
  }, [files]);

  /**
   * Save the files to the files array
   * @param files
   */
  const saveFiles = (files: any) => {
    /**
     * Create a new array to store the files
     */
    const filesArray: File[] = [];

    /**
     * Loop through the files array and download the files
     */
    Promise.all(
      files.map(async (file: any) => {
        /**
         * Download the file from the one drive
         */
        const response = await fetch(file['@microsoft.graph.downloadUrl']);
        /**
         * Convert the file to blob
         */
        const blob = await response.blob();
        /**
         * Create a new file from the blob
         */
        const newFile = new File([blob], file.name, {
          type: file.file.mimeType,
        });
        /**
         * Push the new file to the files array
         */
        filesArray.push(newFile);
      })
    ).then(() => {
      /**
       * Compress the files if the user want to compress the files
       */
      if (files.length == 0) return;
      if (toBeCompressed)
        /**
         * Compress the files and set the files array
         */
        filesArray.map(async (file) => {
          setFiles([
            ...files,
            await compressFile({ element: file, element_name: file.name }),
          ]);
        });
      /**
       * Otherwise, just set the files array
       */ else setFiles(filesArray);
    });
  };

  /**
   * Open the one drive picker
   */
  const openPicker = () => {
    /**
     * One Drive options
     */
    const odOptions = {
      clientId: oneDriveConfigs ? oneDriveConfigs.onedrive_client_id : '',
      action: 'download',
      multiSelect: oneDriveConfigs ? oneDriveConfigs.multiSelect : false,
      openInNewWindow: true,
      advanced: {
        //     redirectUri: 'http://localhost:3000',
        filter: '.jpg,.png,.pdf,.docx,.xlsx,.pptx',
        queryParameters: 'select=id,name,size,file,folder',
        //     scopes: 'files.readwrite.all',
      },
      success: (response: any) => {
        /**
         *  Save the files to the files array
         */
        saveFiles(response.value);
      },
      cancel: () => {
        console.log('User cancelled');
      },
      error: (e: any) => {
        console.log(e);
      },
    };
    /**
     * Open the one drive picker with the options above
     * @see https://docs.microsoft.com/en-us/onedrive/developer/controls/file-pickers/js-v72/open-file-picker
     */
    (window as any).OneDrive.open(odOptions);
  };

  return (
    <div>
      {isLoaded && (
        // one drive button with logo and text
        <button
          onClick={openPicker}
          className="flex items-center justify-center bg-white hover:bg-gray-100 text-gray-900 py-2 px-4 rounded-lg shadow-md transition-colors duration-300"
        >
          <img
            src="https://static2.sharepointonline.com/files/fabric/assets/brand-icons/product/svg/onedrive_32x1.svg"
            alt="One Drive Logo"
            className="w-5 h-5 mr-2 fill-current"
            width="20"
            height="20"
          />
          Select from One Drive
        </button>
      )}
    </div>
  );
};

export default OneDrive;
