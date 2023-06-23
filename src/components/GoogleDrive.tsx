import React, { FC } from 'react';
import useLoadGAPI from '../hooks/useLoadGAPI';
import { pubObject } from '../lib/putObject';
import { compressFile } from '../lib/compressFile';
import { ICloudStorageConfigs } from '../types/ICloudStorageConfigs';
import { IBaseConfigs } from '../types/IBaseConfigs';
import { IGoogleConfigs } from '../types/IGoogleConfigs';

export interface GoogleDriveProps {
  client: any;
  cloudStorageConfigs: ICloudStorageConfigs;
  baseConfigs: IBaseConfigs;
  googleConfigs: IGoogleConfigs;
}

/**
 * Upload files from Google Drive to S3 bucket
 * @param client S3 client
 * @param bucket S3 bucket name
 * @param google_app_id app id from Google Cloud Platform
 * @param google_api_key api key from Google Cloud Platform
 * @param google_client_id client id from Google Cloud Platform
 * @param setKey return the final name of the file, usually it has timestamp prefix
 * @param toBeCompressed whether the user want to compress the file before uploading it or not. Default value is false
 * @constructor
 */
export const GoogleDrive: FC<GoogleDriveProps> = ({
  client,
  cloudStorageConfigs: { bucket },
  googleConfigs: { google_app_id, google_api_key, google_client_id },
  baseConfigs: { setKey, toBeCompressed },
}: GoogleDriveProps) => {
  const { pickerApiLoaded, gisLoaded, tokenClient } = useLoadGAPI({
    google_client_id,
  });

  let accessToken: string;
  const google = (window as any).google;

  /**
   * Get the access token
   */
  const showPicker = async () => {
    const picker = new google.picker.PickerBuilder()
      .addView(google.picker.ViewId.DOCS)
      .setOAuthToken(accessToken)
      .setDeveloperKey(google_api_key)
      .setAppId(google_app_id)
      .setCallback(pickerCallback)
      .build();
    picker.setVisible(true);
    console.log('picker', picker);
  };

  /**
   * Create a picker to select files from Google Drive
   */
  const createPicker = () => {
    // Request an access token
    tokenClient.callback = async (response: any) => {
      if (response.error !== undefined) {
        throw response;
      }
      accessToken = response.access_token;
      if (response.access_token) {
        await showPicker();
      }
    };

    if (!accessToken) {
      // Prompt the user to select a Google Account and ask for consent to share their data
      // when establishing a new session.
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      // Skip display of account chooser and consent dialog for an existing session.
      tokenClient.requestAccessToken({ prompt: '' });
    }
  };

  /**
   * Callback function to get the file from Google Drive
   * @param data
   */
  const pickerCallback = async (data: any): Promise<void> => {
    if (data.action === google.picker.Action.PICKED) {
      const document = data[google.picker.Response.DOCUMENTS][0];
      const fileId = document[google.picker.Document.ID];
      let fileToUpload: File;

      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;

      // Download the file
      const response: Response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to download file: ${response.status} ${response.statusText}`
        );
      }

      if (toBeCompressed)
        // Compress the file
        fileToUpload = await compressFile({
          element: response,
          element_name: document[google.picker.Document.NAME],
        });
      // Read the file content as a Buffer
      else
        fileToUpload = await response
          .arrayBuffer()
          .then(
            (buffer) =>
              new File([buffer], document[google.picker.Document.NAME])
          );

      // assign a unique name for the file, usually has to timestamp prefix
      const key = `${Date.now()}__${fileToUpload.name}`;

      // upload the file to the cloud
      pubObject({ client, bucket, key, file: fileToUpload });

      // set the file name
      setKey(key);
    }
  };

  return (
    <div>
      {pickerApiLoaded && gisLoaded && (
        <button onClick={createPicker}>google drive</button>
      )}
    </div>
  );
};
