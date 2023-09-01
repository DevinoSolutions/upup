import { useEffect, useState } from 'react'
import useLoadGAPI from './useLoadGAPI'

const google_client_id = process.env.GOOGLE_CLIENT_PICKER_ID
const google_app_id = process.env.GOOGLE_APP_ID
const google_api_key = process.env.GOOGLE_API_KEY

const useGoogleDrive = () => {
    const [user, setUser] = useState<any>(null)
    const [files, setFiles] = useState<any>(null)

    const { tokenClient, gisLoaded } = useLoadGAPI({
        google_client_id,
    })

    let accessToken: string

    const logFiles = async () => {
        // @ts-ignore
        const response = await gapi.client.drive.files.list({
            fields: 'files(id, name, mimeType, size, thumbnailLink, parents, fileExtension)',
        })
        const files = response.result.files
        if (files && files.length > 0) {
            console.log('Files:')
            files.forEach((file: any) => {
                console.log(file)
            })
        } else {
            console.log('No files found.')
        }
    }

    useEffect(() => {
        const onGisLoaded = async () => {
            // Request an access token
            // tokenClient.callback = async (response: any) => {
            //     if (response.error !== undefined) throw response

            //     if (response.access_token) {
            //         accessToken = response.access_token
            //         logFiles()
            //     }
            // }

            // if (!accessToken) {
            //     // Prompt the user to select a Google Account and ask for consent to share their data
            //     // when establishing a new session.
            //     tokenClient.requestAccessToken()
            // }

            const auth2 = gapi.auth2.getAuthInstance()

            auth2
                .grantOfflineAccess({
                    prompt: 'select_account',
                })
                .then((res: any) => {
                    console.log('res', res)
                })
        }

        if (gisLoaded) {
            onGisLoaded()
        }
    }, [gisLoaded])

    useEffect(() => {
        console.log('user', user)
        console.log('files', files)
    }, [user, files])

    return { user, files }
}

export default useGoogleDrive
