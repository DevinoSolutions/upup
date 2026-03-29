'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useUploaderContext } from '../context/uploader-context'
import type { GoogleFile, GoogleRoot, GoogleToken, GoogleUser } from '../lib/google-drive-utils'
import { getWorkspaceExportInfo, isDriveFileAccepted } from '../lib/google-drive-utils'
import useLoadGAPI from './use-load-gapi'

const TOKEN_KEY = 'upup_gdrive_token'

function createSecureStorage() {
    if (typeof window === 'undefined') return null
    return {
        getItem: (key: string) => {
            try {
                return sessionStorage.getItem(key)
            } catch {
                return null
            }
        },
        setItem: (key: string, value: string) => {
            try {
                sessionStorage.setItem(key, value)
            } catch {}
        },
        removeItem: (key: string) => {
            try {
                sessionStorage.removeItem(key)
            } catch {}
        },
    }
}

export type GoogleDriveConfigs = {
    google_client_id?: string
    google_api_key?: string
}

export default function useGoogleDrive(googleConfigs: GoogleDriveConfigs = {}) {
    const { google_client_id, google_api_key } = googleConfigs
    const ctx = useUploaderContext()
    const onError = ctx.core.options.onError ?? ((msg: string) => console.error(msg))

    const [user, setUser] = useState<GoogleUser>()
    const [googleFiles, setGoogleFiles] = useState<GoogleRoot>()
    const [rawFiles, setRawFiles] = useState<GoogleFile[]>()
    const [token, setToken] = useState<GoogleToken>()
    const [authCancelled, setAuthCancelled] = useState(false)
    const tokenClientRef = useRef<{ requestAccessToken: (opts?: object) => void } | null>(null)

    const { gisLoaded } = useLoadGAPI()

    const fetchDrive = useCallback(
        async (url: string) => {
            return await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token?.access_token}`,
                },
            })
        },
        [token],
    )

    const getFilesList = useCallback(async () => {
        const response = await fetchDrive(
            `https://www.googleapis.com/drive/v3/files?fields=files(fileExtension,id,mimeType,name,parents,size,thumbnailLink)&key=${google_api_key}`,
        )
        const data = await response.json()
        if (data.error) {
            onError(data.error)
            return
        }
        setRawFiles(data.files)
    }, [fetchDrive, google_api_key, onError])

    const getUserName = useCallback(async () => {
        const response = await fetchDrive(
            `https://www.googleapis.com/oauth2/v3/userinfo`,
        )
        const data = await response.json()
        setUser(data)
    }, [fetchDrive])

    const handleSignOut = async () => {
        const storage = createSecureStorage()
        storage?.removeItem(TOKEN_KEY)
        setUser(undefined)
        setGoogleFiles(undefined)
    }

    const organizeFiles = useCallback(() => {
        if (!rawFiles) return

        const fileIds = new Set(rawFiles.map((f) => f.id))
        const organizedFiles: GoogleFile[] = rawFiles.filter(
            (f) => !(f.parents && fileIds.has(f.parents[0])),
        )
        const parentIdToChildrenMap: { [key: string]: GoogleFile[] } = {}

        rawFiles.forEach((file) => {
            if (file.parents) {
                file.parents.forEach((parentId) => {
                    if (!parentIdToChildrenMap[parentId]) {
                        parentIdToChildrenMap[parentId] = []
                    }
                    parentIdToChildrenMap[parentId].push(file)
                })
            }
        })

        const recurse = (file: GoogleFile) => {
            const children = parentIdToChildrenMap[file.id]
            if (children && children.length) {
                file.children = children
                children.forEach(recurse)
            }
        }

        organizedFiles.forEach(recurse)

        setGoogleFiles({
            id: 'root-drive',
            name: 'Drive',
            children: organizedFiles,
        })
    }, [rawFiles])

    useEffect(() => {
        if (typeof window === 'undefined') return

        const storage = createSecureStorage()
        const storedTokenStr = storage?.getItem(TOKEN_KEY)
        const storedToken = storedTokenStr ? JSON.parse(storedTokenStr) : null

        if (storedToken && storedToken.expires_in > Date.now()) {
            setToken(storedToken)
            return
        }

        if (gisLoaded) {
            ;(async () => {
                const google = (window as any).google
                if (!google?.accounts?.oauth2) return

                const client = google.accounts.oauth2.initTokenClient({
                    client_id: google_client_id,
                    scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile',
                    ux_mode: 'popup',
                    callback(tokenResponse: GoogleToken) {
                        if (!tokenResponse?.error) {
                            setAuthCancelled(false)
                            storage?.setItem(
                                TOKEN_KEY,
                                JSON.stringify({
                                    ...tokenResponse,
                                    expires_in:
                                        Date.now() +
                                        (tokenResponse.expires_in - 20) * 1000,
                                }),
                            )
                            setToken(tokenResponse)
                        } else {
                            onError(String(tokenResponse?.error ?? ''))
                        }
                    },
                    error_callback(error: { type: string; message?: string }) {
                        setAuthCancelled(true)
                        onError(error.message || error.type)
                    },
                })
                tokenClientRef.current = client
                client.requestAccessToken({})
            })()
        }
    }, [gisLoaded, google_client_id, onError])

    useEffect(() => {
        if (token) {
            ;(async () => {
                await getUserName()
                await getFilesList()
            })()
        }
    }, [getFilesList, getUserName, token])

    useEffect(() => {
        organizeFiles()
    }, [organizeFiles])

    const retryAuth = useCallback(() => {
        setAuthCancelled(false)
        tokenClientRef.current?.requestAccessToken({})
    }, [])

    return { user, googleFiles, handleSignOut, token, authCancelled, retryAuth }
}
