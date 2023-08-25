import React, { FC } from 'react'
import useLoadGAPI from '../hooks/useLoadGAPI'
import { compressFile } from '../lib/compressFile'
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
    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.1);
    transition:
        background-color 0.3s ease-in-out,
        color 0.3s ease-in-out;

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
export interface Props {
    baseConfigs: BaseConfigs
    googleConfigs: GoogleConfigs
    setFiles: React.Dispatch<React.SetStateAction<File[]>>
    setView: React.Dispatch<React.SetStateAction<string>>
}

/**
 * Upload files from Google Drive to S3 bucket
 * @param google_app_id app id from Google Cloud Platform
 * @param google_api_key api key from Google Cloud Platform
 * @param google_client_id client id from Google Cloud Platform
 * @param toBeCompressed whether the user want to compress the file before uploading it or not. Default value is false
 * @param multiple whether the user want to upload multiple files or not. Default value is false
 * @param setFiles return the files to the parent component
 * @param setView return the view to the parent component
 * @constructor
 */
export const GoogleDriveUploader: FC<Props> = ({
    googleConfigs: { google_app_id, google_api_key, google_client_id },
    baseConfigs: { toBeCompressed, multiple },
    setFiles,
    setView,
}: Props) => {
    const { pickerApiLoaded, gisLoaded, tokenClient } = useLoadGAPI({
        google_client_id,
    })

    let accessToken: string
    const google = (window as any).google

    /**
     * Show the file picker once authentication has been done.
     * @private
     */
    const showPicker = async () => {
        const view = new google.picker.DocsView()
            .setMimeTypes('image/png,image/jpeg,image/jpg,application/pdf')
            .setMode(google.picker.DocsViewMode.LIST)
            .setIncludeFolders(true)

        const pickerBuilder = new google.picker.PickerBuilder()

        multiple &&
            pickerBuilder.enableFeature(
                google.picker.Feature.MULTISELECT_ENABLED,
            )

        pickerBuilder
            .addView(view)
            .setOAuthToken(accessToken)
            .setDeveloperKey(google_api_key)
            .setAppId(google_app_id)
            .setCallback(pickerCallback)
            .build()
            .setVisible(true)
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
                    `Failed to download file: ${response.status} ${response.statusText}`,
                )
            }

            if (toBeCompressed) {
                // Compress the file
                fileToUpload = await compressFile({
                    element: response,
                    element_name: document[google.picker.Document.NAME],
                })
            }
            // Read the file content as a Buffer
            else
                fileToUpload = await response
                    .arrayBuffer()
                    .then(
                        buffer =>
                            new File(
                                [buffer],
                                document[google.picker.Document.NAME],
                            ),
                    )

            /**
             * Set the file to be uploaded
             */
            setFiles((files: File[]) => [...files, fileToUpload])
            setView('internal')
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
                    Google Drive
                </GoogleDriveButton>
            )}
        </div>
    )
}
