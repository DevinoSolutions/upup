import React, { FC, useEffect, useState } from 'react';
import useLoadOdAPI from '../hooks/useLoadOdAPI';
import { IBaseConfigs } from '../types/IBaseConfigs';
import { IOneDriveConfigs } from '../types/IOneDriveConfigs';
import { compressFile } from '../lib/compressFile';
import { pubObject } from '../lib/putObject';
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

  useEffect(() => {
    files.map((file) => {
      const key = `${Date.now()}__${file.name}`;
      pubObject({ client, bucket, key, file });
      setKey(key);
    });
  }, [files]);

  const saveFiles = (files: any) => {
    const filesArray: File[] = [];
    Promise.all(
      files.map(async (file: any) => {
        const response = await fetch(file['@microsoft.graph.downloadUrl']);
        const blob = await response.blob();
        const newFile = new File([blob], file.name, {
          type: file.file.mimeType,
        });
        filesArray.push(newFile);
      })
    ).then(() => {
      if (files.length == 0) return;
      if (toBeCompressed)
        filesArray.map(async (file) => {
          setFiles([
            ...files,
            await compressFile({ element: file, element_name: file.name }),
          ]);
        });
      else setFiles(filesArray);
    });
  };

  const openPicker = () => {
    const odOptions = {
      clientId: oneDriveConfigs ? oneDriveConfigs.ONEDRIVE_CLIENT_ID : '',
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
        saveFiles(response.value);
      },
      cancel: () => {
        console.log('User cancelled');
      },
      error: (e: any) => {
        console.log(e);
      },
    };
    const OneDrive = (window as any).OneDrive;
    OneDrive.open(odOptions);
  };

  return (
    <div>{isLoaded && <button onClick={openPicker}>One Drive</button>}</div>
  );
};

export default OneDrive;
