'use client'

import { useCallback, useEffect, useState } from 'react'
import { useUploaderContext } from '../context/uploader-context'
import type { DropboxFile, DropboxRoot, DropboxUser } from '../lib/google-drive-utils'
import { useDropboxAuth, type DropboxConfigs } from './use-dropbox-auth'

const formatFileItem = (entry: any): DropboxFile => ({
    id: entry.id,
    name: entry.name,
    path_display: entry.path_display,
    isFolder: entry['.tag'] === 'folder',
    size: entry.size,
    thumbnailLink: null,
})

export function useDropbox(configs?: DropboxConfigs) {
    const ctx = useUploaderContext()
    const t = ctx.t
    const onError = ctx.core.options.onError ?? ((msg: string) => console.error(msg))
    const dropboxConfigs = configs ?? ctx.core.options.dropboxConfigs

    const {
        isAuthenticated,
        token,
        refreshToken,
        isLoading,
        authenticate,
        logout,
        refreshAccessToken,
    } = useDropboxAuth(dropboxConfigs)

    const [user, setUser] = useState<DropboxUser>()
    const [dropboxFiles, setDropboxFiles] = useState<DropboxRoot>()

    const fetchDropbox = useCallback(
        async (
            url: string,
            method = 'POST',
            body: object | null = {},
            isRetry = false,
        ): Promise<Response> => {
            const headers: Record<string, string> = {
                Authorization: `Bearer ${token}`,
            }
            const requestOptions: RequestInit = { method, headers }
            if (body !== null) {
                headers['Content-Type'] = 'application/json'
                requestOptions.body = JSON.stringify(body)
            }

            const response = await fetch(url, requestOptions)

            if (!response.ok) {
                const errorText = await response.text()
                let errorMessage = `Dropbox API error (${response.status})`

                try {
                    const errorJson = JSON.parse(errorText)
                    errorMessage = errorJson.error_summary || errorMessage

                    if (
                        response.status === 401 &&
                        errorMessage.includes('expired_access_token') &&
                        refreshToken &&
                        !isRetry
                    ) {
                        const newToken = await refreshAccessToken(refreshToken)
                        if (newToken) return fetchDropbox(url, method, body, true)
                        throw new Error('Failed to refresh expired token')
                    }

                    if (
                        response.status === 401 &&
                        errorMessage.includes('expired_access_token') &&
                        !refreshToken
                    ) {
                        onError(t('errors.dropboxSessionExpired'))
                        logout()
                        throw new Error('Token expired - re-authentication required')
                    }
                } catch (parseErr) {
                    if (response.status === 401 && refreshToken && !isRetry) {
                        const newToken = await refreshAccessToken(refreshToken)
                        if (newToken) return fetchDropbox(url, method, body, true)
                    } else if (response.status === 401 && !refreshToken) {
                        onError(t('errors.dropboxSessionExpired'))
                        logout()
                        throw new Error('Token expired - re-authentication required')
                    }
                }

                throw new Error(errorMessage)
            }

            return response
        },
        [token, refreshToken, refreshAccessToken, onError, logout],
    )

    const getUserInfo = useCallback(async () => {
        try {
            const response = await fetchDropbox(
                'https://api.dropboxapi.com/2/users/get_current_account',
                'POST',
                null,
            )
            const data = await response.json()
            setUser({ name: data.name.display_name, email: data.email })
        } catch (error) {
            onError(`Failed to fetch user info: ${(error as Error).message}`)
        }
    }, [fetchDropbox, onError])

    const fetchRootContents = useCallback(async () => {
        try {
            const response = await fetchDropbox(
                'https://api.dropboxapi.com/2/files/list_folder',
                'POST',
                {
                    path: '',
                    recursive: false,
                    include_media_info: true,
                    include_deleted: false,
                    include_has_explicit_shared_members: false,
                },
            )
            const data = await response.json()
            const files = data.entries.map(formatFileItem)
            setDropboxFiles({
                id: 'root',
                name: 'Dropbox',
                isFolder: true,
                children: files,
            })
        } catch (error) {
            onError(`Failed to fetch file list: ${(error as Error).message}`)
        }
    }, [fetchDropbox, onError])

    useEffect(() => {
        if (token && isAuthenticated && !isLoading) {
            ;(async () => {
                try {
                    await getUserInfo()
                    await fetchRootContents()
                } catch {}
            })()
        }
    }, [token, isAuthenticated, isLoading, getUserInfo, fetchRootContents])

    return {
        user,
        dropboxFiles,
        logout,
        authenticate,
        token,
        isAuthenticated,
        isLoading,
    }
}
