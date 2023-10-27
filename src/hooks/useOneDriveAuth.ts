import { useCallback, useEffect, useState } from 'react'
import { MicrosoftToken, MicrosoftUser } from 'microsoft'
import usePCAInstance from './usePCAInstance'
import useOneDriveSignIn from './useOneDriveSignIn'

const GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0/me'
const GRAPH_API_FILES_ENDPOINT =
    'https://graph.microsoft.com/v1.0/me/drive/root/children'

interface AuthProps {
    token: MicrosoftToken | undefined
    user: MicrosoftUser | undefined
    fileList: any[] | undefined
}

function useOneDriveAuth(clientId: string): AuthProps {
    const [user, setUser] = useState<MicrosoftUser | undefined>()
    const [fileList, setFileList] = useState<any[]>([])
    const { msalInstance } = usePCAInstance(clientId)
    const { token } = useOneDriveSignIn(msalInstance)

    const fetchFileList = useCallback(async (accessToken: string) => {
        const response = await fetch(GRAPH_API_FILES_ENDPOINT, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })

        if (!response.ok) {
            throw new Error('Failed to fetch file list')
        }

        const data = await response.json()
        return data.value // The list of files is usually inside the "value" property of the response
    }, [])

    const fetchProfileInfo = useCallback(async (accessToken: string) => {
        const response = await fetch(GRAPH_API_ENDPOINT, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })

        if (!response.ok) {
            throw new Error('Failed to fetch profile info')
        }

        return response.json()
    }, [])

    useEffect(() => {
        if (token) {
            ;(async () => {
                const profile = await fetchProfileInfo(token.access_token)
                setUser({
                    displayName: profile.displayName,
                    mail: profile.mail,
                })
            })()
        }
    }, [token, fetchProfileInfo])

    useEffect(() => {
        if (token) {
            ;(async () => {
                const files = await fetchFileList(token.access_token)
                setFileList(files)
            })()
        }
    }, [token, fetchFileList])

    return { token, user, fileList }
}

export default useOneDriveAuth
