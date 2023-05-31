// window.google object is not natively defined in TypeScript.
declare global {
  interface Window {
    google: any;
    OneDrive: any;
  }
}

export { getClient, s3Configs } from './lib/S3';
export { UploadProvider, UpupUploader } from './UpupUploader';
export { BaseConfigs } from './types/BaseConfigs';
export { CloudStorageConfigs } from './types/CloudStorageConfigs';
export { GoogleConfigs } from './types/GoogleConfigs';
export { OneDriveConfigs } from './types/OneDriveConfigs';
