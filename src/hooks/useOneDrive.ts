import { InteractionType } from '@azure/msal-browser'
import { Client } from '@microsoft/microsoft-graph-client'
import { AuthCodeMSALBrowserAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser'
import { MicrosoftUser, OneDriveRoot } from 'microsoft'
import { useCallback, useEffect, useState } from 'react'
import useOneDriveAuth from './useOneDriveAuth'
import usePCAInstance from './usePCAInstance'

interface AuthProps {
    user: MicrosoftUser | undefined
    oneDriveFiles: OneDriveRoot | undefined
    signOut: () => void
    downloadFile: (fileId: string) => Promise<Blob>
    graphClient: Client | null
}

function useOneDrive(clientId: string): AuthProps {
    const [user, setUser] = useState<MicrosoftUser | undefined>()
    const [oneDriveFiles, setOneDriveFiles] = useState<
        OneDriveRoot | undefined
    >()
    const [graphClient, setGraphClient] = useState<Client | null>(null)
    const { msalInstance } = usePCAInstance(clientId)
    const { token, signOut, isInitialized, isAuthenticating } = useOneDriveAuth(
        {
            msalInstance,
            setUser,
            setOneDriveFiles,
        },
    )

    // Initialize Graph client when we have both msalInstance and token
    useEffect(() => {
        const isReady = token && isInitialized && !isAuthenticating
        if (!isReady || !msalInstance) {
            setGraphClient(null)
            return
        }

        try {
            const accounts = msalInstance.getAllAccounts()
            if (accounts.length === 0) {
                console.error('No accounts found')
                return
            }

            const authProvider = new AuthCodeMSALBrowserAuthenticationProvider(
                msalInstance,
                {
                    account: accounts[0],
                    scopes: [
                        'user.read',
                        'files.read.all',
                        'files.readwrite.all',
                    ],
                    interactionType: InteractionType.Popup,
                },
            )

            const client = Client.initWithMiddleware({
                authProvider,
            })

            setGraphClient(client)
        } catch (error) {
            console.error('Error initializing Graph client:', error)
            setGraphClient(null)
        }
    }, [msalInstance, token, isInitialized, isAuthenticating])

    // Fetch user profile and files when Graph client is ready
    useEffect(() => {
        if (!graphClient) return

        const initialize = async () => {
            try {
                const profile = await graphClient.api('/me').get()
                setUser({ name: profile.displayName, mail: profile.mail })

                const filesResponse = await graphClient
                    .api('/me/drive/root/children')
                    .select(
                        'id,name,folder,file,thumbnails,@microsoft.graph.downloadUrl',
                    )
                    .expand('thumbnails')
                    .get()

                const files = filesResponse.value.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    isFolder: !!item.folder,
                    children: item.folder ? [] : undefined,
                    thumbnails: item.thumbnails?.[0] || null,
                    '@microsoft.graph.downloadUrl':
                        item['@microsoft.graph.downloadUrl'],
                    file: item.file,
                }))

                setOneDriveFiles({
                    id: 'root',
                    name: 'OneDrive',
                    isFolder: true,
                    children: files,
                })
            } catch (error) {
                console.error('Error fetching profile or file list:', error)
            }
        }

        initialize()
    }, [graphClient])

    const downloadFile = useCallback(
        async (downloadUrl: string): Promise<Blob> => {
            if (!graphClient) {
                throw new Error('Graph client not initialized')
            }

            try {
                const response = await fetch(downloadUrl)
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }
                return await response.blob()
            } catch (error) {
                console.error('Error downloading file:', error)
                throw error
            }
        },
        [graphClient],
    )

    return {
        user,
        oneDriveFiles,
        signOut,
        downloadFile,
        graphClient,
    }
}

export default useOneDrive
