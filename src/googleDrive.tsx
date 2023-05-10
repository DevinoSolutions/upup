import pako from 'pako'
import React, {FC} from "react";
import useLoadGAPI from "./hooks/useLoadGAPI";


export interface GoogleDriveProps {
    client: any
    bucket: string
    API_KEY: string,
    APP_ID: string,
    CLIENT_ID: string,
    setKey: (key: string) => void
    canUpload?: boolean
}


export const GoogleDrive: FC<GoogleDriveProps> = ({client,bucket, API_KEY, APP_ID, CLIENT_ID,setKey}: GoogleDriveProps) => {
    const {pickerApiLoaded, gisLoaded, tokenClient} = useLoadGAPI({CLIENT_ID})

    let accessToken: string

    const showPicker = async () => {
        const picker = new window.google.picker.PickerBuilder()
            .addView(window.google.picker.ViewId.DOCS)
            .setOAuthToken(accessToken)
            .setDeveloperKey(API_KEY)
            .setAppId(APP_ID)
            .setCallback(pickerCallback)
            .build()
        picker.setVisible(true)
    }

    const createPicker = () => {
        // Request an access token
        tokenClient.callback = async (response: any) => {
            if (response.error !== undefined) {
                throw response
            }
            accessToken = response.access_token
            if (accessToken) {
                await showPicker()
            }
        }

        if (!accessToken) {
            // Prompt the user to select a Google Account and ask for consent to share their data
            // when establishing a new session.
            tokenClient.requestAccessToken({prompt: 'consent'})
        } else {
            // Skip display of account chooser and consent dialog for an existing session.
            tokenClient.requestAccessToken({prompt: ''})
        }
    }

    // TO-DO: Make sure Google Workspace documents can be downloaded.
    const pickerCallback = async (data: any): Promise<void> => {
        if (data.action === window.google.picker.Action.PICKED) {
            const document = data[window.google.picker.Response.DOCUMENTS][0]
            const fileId = document[window.google.picker.Document.ID]

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

            // Read the file content as a Buffer
            const buffer: ArrayBuffer = await response.arrayBuffer()
            const compressedFile: File = new File(
                [pako.gzip(buffer)],
                document[window.google.picker.Document.NAME] + '.gz',
                {
                    type: 'application/octet-stream',
                }
            )

            const key = `${Date.now()}__${compressedFile.name}`
            client.putObject(
                {
                    Bucket: bucket,
                    Key: `${key}`,
                    Body: compressedFile,
                    ACL: 'public-read',
                },
                (err: any, _data: any) => {
                    if (err) console.log(err, err.stack)
                }
            )
            setKey(key)


        }
    }

    return (
        <div>
            {pickerApiLoaded && gisLoaded && (
                <button onClick={createPicker}>google drive</button>
            )}
        </div>
    )
}
