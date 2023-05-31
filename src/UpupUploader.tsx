import React, { FC } from 'react';
import { UploadFiles } from './components/UploadFiles';
import { GoogleDrive } from './components/googleDrive';

export enum Provider {
  internal_upload,
  drive_upload,
}

interface UpupUploaderProps {
  client: any;
  bucket: string;
  setKey: (key: string) => void;
  canUpload: boolean;
  provider: Provider[];
  toBeCompressed?: boolean;
  API_KEY?: string;
  APP_ID?: string;
  CLIENT_ID?: string;
}

/**
 *
 * @param client cloud provider client, ex: S3
 * @param bucket bucket name
 * @param setKey return the final name of the file, usually it has timestamp prefix
 * @param canUpload to control when to upload the file , it has default false value
 * @param provider whether the user want to upload files from internal storage or Google drive or both
 * @param API_KEY you can get this from Google cloud console
 * @param APP_ID the project ID inside Google cloud console
 * @param CLIENT_ID the OAuth client ID
 * @param toBeCompressed whether the user want to compress the file before uploading it or not. Default value is false
 * @constructor
 */
export const UpupUploader: FC<UpupUploaderProps> = ({
  client,
  bucket,
  setKey,
  canUpload,
  provider,
  toBeCompressed = false,
  API_KEY,
  APP_ID,
  CLIENT_ID,
}: UpupUploaderProps) => {
  const components = {
    [Provider.internal_upload]: (
      <UploadFiles
        client={client}
        bucket={bucket}
        setKey={setKey}
        canUpload={canUpload}
        toBeCompressed={toBeCompressed}
      />
    ),
    [Provider.drive_upload]: (
      <GoogleDrive
        client={client}
        bucket={bucket}
        API_KEY={API_KEY || ''}
        APP_ID={APP_ID || ''}
        CLIENT_ID={CLIENT_ID || ''}
        setKey={setKey}
        canUpload={canUpload}
        toBeCompressed={toBeCompressed}
      />
    ),
  };
  const selectedComponent =
    provider.length === 1
      ? components[provider[0]]
      : components[Provider.drive_upload];
  return (
    <>
      {provider.length !== 1 && (
        <div className="max-w-full overflow-hidden flex w-full">
          <UploadFiles
            client={client}
            bucket={bucket}
            setKey={setKey}
            canUpload={canUpload}
            toBeCompressed={toBeCompressed}
          />
        </div>
      )}
      <div className="flex flex-row items-center gap-2">
        {selectedComponent}
      </div>
    </>
  );
};
