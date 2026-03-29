'use client'

import { useEffect, useRef, useState } from 'react'
import { useUploaderContext } from '../context/uploader-context'
import type { MicrosoftUser, OneDriveRoot } from '../lib/google-drive-utils'

export type OneDriveConfigs = {
    onedrive_client_id?: string
}

// Minimal MSAL types to avoid importing the heavy SDK at type-level
type MSALAccount = { homeAccountId: string; username: string }
type MSALInstance = {
    getAllAccounts(): MSALAccount[]
    loginPopup(request: object): Promise<{ account: MSALAccount }>
    logoutPopup(request?: object): Promise<void>
    acquireTokenSilent(request: object): Promise<{ accessToken: string }>
    acquireTokenPopup(request: object): Promise<{ accessToken: string }>
}

const SCOPES = ['user.read', 'files.read.all']

async function loadMSAL(clientId: string): Promise<MSALInstance | null> {
    if (typeof window === 'undefined') return null
    try {
        // Dynamically import @azure/msal-browser if available
        const msal = await import('@azure/msal-browser' as any).catch(() => null)
        if (!msal) return null

        const { PublicClientApplication, LogLevel } = msal
        const instance = new PublicClientApplication({
            auth: {
                clientId,
                redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
            },
            cache: { cacheLocation: 'sessionStorage' },
            system: { loggerOptions: { loggerCallback: () => {}, logLevel: LogLevel?.Warning ?? 3 } },
        })
        await instance.initialize?.()
        return instance as MSALInstance
    } catch {
        return null
    }
}

export default function useOneDrive(clientId = '') {
    const ctx = useUploaderContext()
    const onError = ctx.core.options.onError ?? ((msg: string) => console.error(msg))

    const [user, setUser] = useState<MicrosoftUser>()
    const [oneDriveFiles, setOneDriveFiles] = useState<OneDriveRoot>()
    const [token, setToken] = useState<string>()
    const [authCancelled, setAuthCancelled] = useState(false)
    const msalRef = useRef<MSALInstance | null>(null)
    const initializedRef = useRef(false)

    useEffect(() => {
        if (!clientId || typeof window === 'undefined') return

        ;(async () => {
            try {
                const instance = await loadMSAL(clientId)
                if (!instance) {
                    onError('OneDrive: @azure/msal-browser not available. Install it to use OneDrive.')
                    return
                }
                msalRef.current = instance
                initializedRef.current = true

                // Try silent auth first
                const accounts = instance.getAllAccounts()
                if (accounts.length > 0) {
                    try {
                        const result = await instance.acquireTokenSilent({
                            scopes: SCOPES,
                            account: accounts[0],
                        })
                        setToken(result.accessToken)
                        return
                    } catch {
                        // Fall through to popup
                    }
                }

                // Popup auth
                try {
                    const result = await instance.loginPopup({ scopes: SCOPES })
                    const tokenResult = await instance.acquireTokenSilent({
                        scopes: SCOPES,
                        account: result.account,
                    })
                    setToken(tokenResult.accessToken)
                } catch (err) {
                    setAuthCancelled(true)
                    onError(`OneDrive auth failed: ${(err as Error)?.message}`)
                }
            } catch (err) {
                onError(`OneDrive init error: ${(err as Error)?.message}`)
            }
        })()
    }, [clientId, onError])

    useEffect(() => {
        if (!token) return

        ;(async () => {
            try {
                // Fetch user profile
                const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
                    headers: { Authorization: `Bearer ${token}` },
                })
                const profile = await profileRes.json()
                setUser({ name: profile.displayName, mail: profile.mail })

                // Fetch root files
                const filesRes = await fetch(
                    'https://graph.microsoft.com/v1.0/me/drive/root/children?$select=id,name,folder,file,thumbnails,@microsoft.graph.downloadUrl&$expand=thumbnails',
                    { headers: { Authorization: `Bearer ${token}` } },
                )
                const filesData = await filesRes.json()
                const files = (filesData.value || []).map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    isFolder: !!item.folder,
                    children: item.folder ? [] : undefined,
                    thumbnails: item.thumbnails?.[0] || null,
                    '@microsoft.graph.downloadUrl': item['@microsoft.graph.downloadUrl'],
                    file: item.file,
                }))

                setOneDriveFiles({
                    id: 'root',
                    name: 'OneDrive',
                    isFolder: true,
                    children: files,
                })
            } catch (err) {
                onError(`OneDrive fetch error: ${(err as Error)?.message}`)
            }
        })()
    }, [token, onError])

    const signOut = async () => {
        try {
            const accounts = msalRef.current?.getAllAccounts() ?? []
            if (accounts.length > 0) {
                await msalRef.current?.logoutPopup({ account: accounts[0] })
            }
        } catch {}
        setToken(undefined)
        setUser(undefined)
        setOneDriveFiles(undefined)
    }

    const retryAuth = async () => {
        setAuthCancelled(false)
        if (!msalRef.current) return
        try {
            const result = await msalRef.current.loginPopup({ scopes: SCOPES })
            const tokenResult = await msalRef.current.acquireTokenSilent({
                scopes: SCOPES,
                account: result.account,
            })
            setToken(tokenResult.accessToken)
        } catch (err) {
            setAuthCancelled(true)
            onError(`OneDrive auth failed: ${(err as Error)?.message}`)
        }
    }

    return {
        user,
        oneDriveFiles,
        signOut,
        token,
        authCancelled,
        retryAuth,
    }
}
