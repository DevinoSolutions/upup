import React, { FC } from 'react';
import { OneDriveConfigs } from './types/OneDriveConfigs';
import { UploadFiles } from './components/UploadFiles';
import { GoogleDrive } from './components/googleDrive';
import OneDrive from './components/oneDrive';
import { CloudStorageConfigs } from './types/CloudStorageConfigs';
import { BaseConfigs } from './types/BaseConfigs';
import { GoogleConfigs } from './types/GoogleConfigs';

// salem ss
export enum UploadProvider {
  internal_upload,
  google_drive_upload,
  one_drive_upload,
}

interface UpupUploaderProps {
  cloudStorageConfigs: CloudStorageConfigs;
  baseConfigs: BaseConfigs;
  uploadProvider: UploadProvider[];
  googleConfigs?: GoogleConfigs;
  oneDriveConfigs?: OneDriveConfigs;
}

// /**
//  *
//  * @param client cloud provider client, ex: S3
//  * @param bucket bucket name
//  * @param setKey return the final name of the file, usually it has timestamp prefix
//  * @param canUpload to control when to upload the file , it has default false value
//  * @param provider whether the user want to upload files from internal storage or Google drive or both
//  * @param API_KEY you can get this from Google cloud console
//  * @param APP_ID the project ID inside Google cloud console
//  * @param CLIENT_ID the OAuth client ID
//  * @param toBeCompressed whether the user want to compress the file before uploading it or not. Default value is false
//  * @constructor
//  */
export const UpupUploader: FC<UpupUploaderProps> = ({
  cloudStorageConfigs: { client, bucket },
  baseConfigs: { setKey, canUpload, toBeCompressed = false },
  uploadProvider,
  googleConfigs,
  oneDriveConfigs,
}: UpupUploaderProps) => {
  const { API_KEY, APP_ID, GOOGLE_CLIENT_ID } = googleConfigs || {};
  const { ONEDRIVE_CLIENT_ID } = oneDriveConfigs || {};
  const components = {
    [UploadProvider.internal_upload]: (
      <UploadFiles
        client={client}
        bucket={bucket}
        setKey={setKey}
        canUpload={canUpload}
        toBeCompressed={toBeCompressed}
      />
    ),
    [UploadProvider.google_drive_upload]: (
      <GoogleDrive
        client={client}
        bucket={bucket}
        API_KEY={API_KEY || ''}
        APP_ID={APP_ID || ''}
        CLIENT_ID={GOOGLE_CLIENT_ID || ''}
        setKey={setKey}
        canUpload={canUpload}
        toBeCompressed={toBeCompressed}
      />
    ),
    [UploadProvider.one_drive_upload]: (
      <OneDrive
        oneDriveClientId={ONEDRIVE_CLIENT_ID || ''}
        setKey={setKey}
        canUpload={canUpload}
        toBeCompressed={toBeCompressed}
      />
    ),
  };
  const selectedComponent = uploadProvider.map((p) => components[p]);
  return <>{selectedComponent}</>;
};
