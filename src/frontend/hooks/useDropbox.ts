import { DropboxFile, DropboxRoot, DropboxUser } from 'dropbox'
import { useCallback, useEffect, useState } from 'react'
import { useRootContext } from '../context/RootContext'
import { useDropboxAuth } from './useDropboxAuth'

/**
 * Helper function to format API response items
 */
const formatFileItem = (entry: any): DropboxFile => ({
    id: entry.id,
    name: entry.name,
    path_display: entry.path_display,
    isFolder: entry['.tag'] === 'folder',
    size: entry.size,
    thumbnailLink: null,
})

export function useDropbox() {
    const {
        props: { onError },
        dropboxConfigs,
    } = useRootContext()

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

    // Check if user needs to re-authenticate to get refresh token
    const needsReauth = isAuthenticated && token && !refreshToken

    /**
     * Utility function to make authenticated requests to Dropbox API with automatic token refresh
     */
    const fetchDropbox = useCallback(
        async (
            url: string,
            method = 'POST',
            body: object | null = {},
            isRetry = false,
        ) => {
            if (!token) {
                throw new Error('Not authenticated with Dropbox')
            }

            try {
                const headers: Record<string, string> = {
                    Authorization: `Bearer ${token}`,
                }

                const requestOptions: RequestInit = {
                    method,
                    headers,
                }

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

                        // Handle expired token by attempting refresh
                        if (
                            response.status === 401 &&
                            errorMessage.includes('expired_access_token') &&
                            refreshToken &&
                            !isRetry
                        ) {
                            const newAccessToken =
                                await refreshAccessToken(refreshToken)

                            if (newAccessToken) {
                                return fetchDropbox(url, method, body, true)
                            } else {
                                throw new Error(
                                    'Failed to refresh expired token',
                                )
                            }
                        }

                        // If token is expired but no refresh token available, prompt re-auth
                        if (
                            response.status === 401 &&
                            errorMessage.includes('expired_access_token') &&
                            !refreshToken
                        ) {
                            onError(
                                'Your Dropbox session has expired. Please re-authenticate to continue.',
                            )
                            logout()
                            throw new Error(
                                'Token expired - re-authentication required',
                            )
                        }

                        if (errorMessage.includes('missing_scope')) {
                            errorMessage =
                                'Your Dropbox app is missing required permissions. Please add the following scopes in the Dropbox Developer Console: files.metadata.read, account_info.read'
                        }
                    } catch {
                        // If we can't parse the error, but it's a 401, still try to refresh
                        if (
                            response.status === 401 &&
                            refreshToken &&
                            !isRetry
                        ) {
                            const newAccessToken =
                                await refreshAccessToken(refreshToken)

                            if (newAccessToken) {
                                return fetchDropbox(url, method, body, true)
                            }
                        } else if (response.status === 401 && !refreshToken) {
                            onError(
                                'Your Dropbox session has expired. Please re-authenticate to continue.',
                            )
                            logout()
                            throw new Error(
                                'Token expired - re-authentication required',
                            )
                        }

                        errorMessage = errorText
                            ? `${errorMessage}: ${errorText}`
                            : errorMessage
                    }

                    throw new Error(errorMessage)
                }

                return response
            } catch (error) {
                console.error('Dropbox API error:', error)
                throw error
            }
        },
        [token, refreshToken, refreshAccessToken, onError, logout],
    )

    /**
     * Get the user's information from Dropbox
     */
    const getUserInfo = useCallback(async () => {
        try {
            const response = await fetchDropbox(
                'https://api.dropboxapi.com/2/users/get_current_account',
                'POST',
                null,
            )
            const data = await response.json()
            setUser({
                name: data.name.display_name,
                email: data.email,
            })
        } catch (error) {
            onError(`Failed to fetch user info: ${(error as Error).message}`)
        }
    }, [fetchDropbox, onError])

    /**
     * Get the list of files from Dropbox root
     */
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

    /**
     * Initialize user data and files when authentication is complete
     */
    useEffect(() => {
        if (token && isAuthenticated && !isLoading) {
            ;(async () => {
                try {
                    await getUserInfo()
                    await fetchRootContents()
                } catch (error) {
                    console.error('Error initializing Dropbox data:', error)
                }
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
        needsReauth,
    }
}
