import React, { FC } from 'react';
import { OneDriveConfigs } from './types/OneDriveConfigs';
import { UploadFiles } from './components/UploadFiles';
import { GoogleDrive } from './components/googleDrive';
import OneDrive from './components/oneDrive';
import { CloudStorageConfigs } from './types/CloudStorageConfigs';
import { BaseConfigs } from './types/BaseConfigs';
import { GoogleConfigs } from './types/GoogleConfigs';

// salem ss
export enum Provider {
  internal_upload,
  google_drive_upload,
  one_drive_upload,
}

interface UpupUploaderProps {
  cloudStorageConfigs: CloudStorageConfigs;
  baseConfigs: BaseConfigs;
  uploadProviders: Provider[];
  googleConfigs?: GoogleConfigs | undefined;
  oneDriveConfigs?: OneDriveConfigs | undefined;
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
  const components = {
    [Provider.internal_upload]: (
      <UploadFiles
        cloudStorageConfigs={cloudStorageConfigs}
        baseConfigs={baseConfigs}
      />
    ),
    [Provider.google_drive_upload]: (
      <GoogleDrive
        cloudStorageConfigs={cloudStorageConfigs}
        googleConfigs={googleConfigs}
        baseConfigs={baseConfigs}
      />
    ),
    [Provider.one_drive_upload]: (
      <OneDrive
        cloudStorageConfigs={cloudStorageConfigs}
        baseConfigs={baseConfigs}
        oneDriveConfigs={oneDriveConfigs}
      />
    ),
  };
  const selectedComponent = uploadProviders.map((p) => components[p]);
  return <>{selectedComponent}</>;
};
