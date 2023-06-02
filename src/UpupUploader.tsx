import React, { FC } from 'react';
import { IOneDriveConfigs } from './types/IOneDriveConfigs';
import { UploadFiles } from './components/UploadFiles';
import { GoogleDrive } from './components/googleDrive';
import OneDrive from './components/oneDrive';
import { ICloudStorageConfigs } from './types/ICloudStorageConfigs';
import { IBaseConfigs } from './types/IBaseConfigs';
import { IGoogleConfigs } from './types/IGoogleConfigs';
import { getClient } from './lib/getClient';

// salem ss
export enum Provider {
  internal_upload,
  google_drive_upload,
  one_drive_upload,
}

interface UpupUploaderProps {
  cloudStorageConfigs: ICloudStorageConfigs;
  baseConfigs: IBaseConfigs;
  uploadProviders: Provider[];
  googleConfigs?: IGoogleConfigs | undefined;
  oneDriveConfigs?: IOneDriveConfigs | undefined;
}

/**
 *
 * @param cloudStorageConfigs cloud provider configurations
 * @param baseConfigs base configurations
 * @param toBeCompressed whether the user want to compress the file before uploading it or not. Default value is false
 * @param uploadProviders whether the user want to upload files from internal storage or Google drive or both
 * @param googleConfigs google configurations
 * @param oneDriveConfigs one drive configurations
 * @constructor
 */
export const UpupUploader: FC<UpupUploaderProps> = ({
  cloudStorageConfigs,
  baseConfigs: { toBeCompressed = false, ...baseConfigs },
  uploadProviders,
  googleConfigs,
  oneDriveConfigs,
}: UpupUploaderProps) => {
  const client = getClient(cloudStorageConfigs.s3Configs);

  const components = {
    [Provider.internal_upload]: (
      <UploadFiles
        client={client}
        cloudStorageConfigs={cloudStorageConfigs}
        baseConfigs={baseConfigs}
      />
    ),
    [Provider.google_drive_upload]: (
      <GoogleDrive
        client={client}
        cloudStorageConfigs={cloudStorageConfigs}
        googleConfigs={googleConfigs as IGoogleConfigs}
        baseConfigs={baseConfigs}
      />
    ),
    [Provider.one_drive_upload]: (
      <OneDrive
        client={client}
        cloudStorageConfigs={cloudStorageConfigs}
        baseConfigs={baseConfigs}
        oneDriveConfigs={oneDriveConfigs}
      />
    ),
  };
  const selectedComponent = uploadProviders.map((p) => components[p]);
  return <>{selectedComponent}</>;
};
