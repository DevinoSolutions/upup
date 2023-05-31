import React, { FC } from 'react';
import useLoadGAPI from '../hooks/useLoadGAPI';
import { pubObject } from '../lib/putObject';
import { compressFile } from '../lib/compressFile';
import { CloudStorageConfigs } from '../types/CloudStorageConfigs';
import { BaseConfigs } from '../types/BaseConfigs';
import { GoogleConfigs } from '../types/GoogleConfigs';

export interface GoogleDriveProps {
  cloudStorageConfigs: CloudStorageConfigs;
  baseConfigs: BaseConfigs;
  googleConfigs: GoogleConfigs | undefined;
}

/**
 *
 * @param client cloud provider client, ex: S3
 * @param bucket bucket name
 * @param googleConfigs  google configurations ex: API_KEY, APP_ID, GOOGLE_CLIENT_ID
 * @param setKey return the final name of the file, usually it has timestamp prefix
 * @param toBeCompressed whether the user want to compress the file before uploading it or not. Default value is false
 * @constructor
 */
export const GoogleDrive: FC<GoogleDriveProps> = ({
  cloudStorageConfigs: { client, bucket },
  googleConfigs,
  baseConfigs: { setKey, toBeCompressed },
}: GoogleDriveProps) => {
  const { API_KEY, APP_ID, GOOGLE_CLIENT_ID } = googleConfigs || {};
  const { pickerApiLoaded, gisLoaded, tokenClient } = useLoadGAPI({
    CLIENT_ID: GOOGLE_CLIENT_ID,
  });

  let accessToken: string;
  const google = (window as any).google;

  const showPicker = async () => {
    const picker = new google.picker.PickerBuilder()
      .addView(google.picker.ViewId.DOCS)
      .setOAuthToken(accessToken)
      .setDeveloperKey(API_KEY)
      .setAppId(APP_ID)
      .setCallback(pickerCallback)
      .build();
    picker.setVisible(true);
  };

  const createPicker = () => {
    // Request an access token
    tokenClient.callback = async (response: any) => {
      if (response.error !== undefined) {
        throw response;
      }
      accessToken = response.access_token;
      if (accessToken) {
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

  // TO-DO: Make sure Google Workspace documents can be downloaded.
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
