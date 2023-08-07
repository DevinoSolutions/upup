import React, { FC } from 'react'
import useLoadGAPI from '../hooks/useLoadGAPI'
import { putObject } from '../lib/putObject'
import { compressFile } from '../lib/compressFile'
import { CloudStorageConfigs } from '../types/CloudStorageConfigs'
import { BaseConfigs } from '../types/BaseConfigs'
import { GoogleConfigs } from '../types/GoogleConfigs'
import styled from 'styled-components'

const GoogleDriveButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #ffffff;
    color: #4a5568;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    box-shadow: 0px 2px 3px rgba(0, 0, 0, 0.1);
    transition: background-color 0.3s ease-in-out, color 0.3s ease-in-out;

    &:hover {
        background-color: #f0f4f8;
        color: #2d3748;
    }

    img {
        width: 1.25rem;
        height: 1.25rem;
        margin-right: 0.5rem;
        fill: currentColor;
    }
`

const GoogleDriveLogo = styled.img`
    width: 20px;
    height: 20px;
    margin-right: 8px;
`
export interface GoogleDriveProps {
    client: any
    cloudStorageConfigs: CloudStorageConfigs
    baseConfigs: BaseConfigs
    googleConfigs: GoogleConfigs
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
    baseConfigs: { setKeys, toBeCompressed },
}: GoogleDriveProps) => {
    const { pickerApiLoaded, gisLoaded, tokenClient } = useLoadGAPI({
        google_client_id,
    })

    let accessToken: string
    const google = (window as any).google

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
            .build()
        picker.setVisible(true)
        console.log('picker', picker)
    }

    /**
     * Create a picker to select files from Google Drive
     */
    const createPicker = () => {
        // Request an access token
        tokenClient.callback = async (response: any) => {
            if (response.error !== undefined) {
                throw response
            }
            accessToken = response.access_token
            if (response.access_token) {
                await showPicker()
            }
        }

        if (!accessToken) {
            // Prompt the user to select a Google Account and ask for consent to share their data
            // when establishing a new session.
            tokenClient.requestAccessToken({ prompt: 'consent' })
        } else {
            // Skip display of account chooser and consent dialog for an existing session.
            tokenClient.requestAccessToken({ prompt: '' })
        }
    }

    /**
     * Callback function to get the file from Google Drive
     * @param data
     */
    const pickerCallback = async (data: any): Promise<void> => {
        if (data.action === google.picker.Action.PICKED) {
            const document = data[google.picker.Response.DOCUMENTS][0]
            const fileId = document[google.picker.Document.ID]
            let fileToUpload: File

            const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`

            // Download the file
            const response: Response = await fetch(downloadUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            if (!response.ok) {
                throw new Error(
                    `Failed to download file: ${response.status} ${response.statusText}`
                )
            }

            if (toBeCompressed)
                // Compress the file
                fileToUpload = await compressFile({
                    element: response,
                    element_name: document[google.picker.Document.NAME],
                })
            // Read the file content as a Buffer
            else
                fileToUpload = await response
                    .arrayBuffer()
                    .then(
                        buffer =>
                            new File(
                                [buffer],
                                document[google.picker.Document.NAME]
                            )
                    )

            // assign a unique name for the file, usually has to timestamp prefix
            const key = `${Date.now()}__${fileToUpload.name}`

            // upload the file to the cloud
            putObject({ client, bucket, key, file: fileToUpload })

            // set the file name
            setKeys([key])
        }
    }

    return (
        <div>
            {pickerApiLoaded && gisLoaded && (
                // google drive button with logo and text
                <GoogleDriveButton onClick={createPicker}>
                    <GoogleDriveLogo
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Drive_icon_%282020%29.svg/1200px-Google_Drive_icon_%282020%29.svg.png"
                        alt="Google Drive Logo"
                    />
                    Select from Google Drive
                </GoogleDriveButton>
            )}
        </div>
    )
}
