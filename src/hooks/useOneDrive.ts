import { InteractionType } from '@azure/msal-browser'
import { Client } from '@microsoft/microsoft-graph-client'
import { AuthCodeMSALBrowserAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser'
import { useConfigContext } from 'context/config-context'
import useOneDriveAuth from 'hooks/useOneDriveAuth'
import usePCAInstance from 'hooks/usePCAInstance'
import { onedriveFetchFiles } from 'lib/onedrive'
import { useEffect, useState } from 'react'
import { MicrosoftUser, OneDriveRoot } from 'types'

function useOneDrive() {
    const { adaptersConfigs } = useConfigContext()
    const clientId = adaptersConfigs?.oneDrive?.clientId as string
    const [user, setUser] = useState<MicrosoftUser>()
    const [oneDriveFiles, setOneDriveFiles] = useState<OneDriveRoot>()
    const [graphClient, setGraphClient] = useState<Client>()
    const { msalInstance } = usePCAInstance(clientId)
    const { signOut, isReady } = useOneDriveAuth({
        msalInstance,
        setUser,
        setOneDriveFiles,
    })

    const fetchProfileAndFiles = async () => {
        try {
            const profile = await graphClient?.api('/me').get()
            setUser({ name: profile.displayName, mail: profile.mail })

            const files = await onedriveFetchFiles(graphClient)

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

    // Initialize Graph client when we have both msalInstance and token
    useEffect(() => {
        try {
            if (!isReady || !msalInstance) return

            const accounts = msalInstance.getAllAccounts()
            if (!accounts.length) throw new Error('No accounts found')

            setGraphClient(
                Client.initWithMiddleware({
                    authProvider: new AuthCodeMSALBrowserAuthenticationProvider(
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
                    ),
                }),
            )
        } catch (error) {
            console.error('Error initializing Graph client:', error)
            setGraphClient(undefined)
        }
    }, [msalInstance, isReady])

    // Fetch user profile and files when Graph client is ready
    useEffect(() => {
        if (graphClient) fetchProfileAndFiles()
    }, [graphClient])

    return {
        user,
        oneDriveFiles,
        signOut,
        graphClient,
    }
}

export default useOneDrive
