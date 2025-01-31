import { InteractionType } from '@azure/msal-browser'
import { Client } from '@microsoft/microsoft-graph-client'
import { AuthCodeMSALBrowserAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser'
import { MicrosoftUser, OneDriveRoot } from 'microsoft'
import { useEffect, useState } from 'react'
import { useRootContext } from '../context/RootContext'
import useOneDriveAuth from './useOneDriveAuth'
import usePCAInstance from './usePCAInstance'

export default function useOneDrive(clientId = '') {
    const {
        props: { onError },
    } = useRootContext()
    const [user, setUser] = useState<MicrosoftUser>()
    const [oneDriveFiles, setOneDriveFiles] = useState<OneDriveRoot>()
    const [graphClient, setGraphClient] = useState<Client>()
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
            setGraphClient(undefined)
            return
        }

        try {
            const accounts = msalInstance.getAllAccounts()
            if (accounts.length === 0) throw new Error('No accounts found')

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
            onError(`Error initializing Graph client: ${error}`)
            setGraphClient(undefined)
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
                onError('Error fetching profile or file list:' + error)
            }
        }

        initialize()
    }, [graphClient])

    return {
        user,
        oneDriveFiles,
        signOut,
        graphClient,
    }
}
