// @ts-expect-error - Dropbox SDK typing issues
import { Dropbox, DropboxUser } from 'dropbox'
import { useCallback, useEffect, useState } from 'react'
import { useRootContext } from '../context/RootContext'

const TOKEN_KEY = 'dropbox_access_token'
const REFRESH_TOKEN_KEY = 'dropbox_refresh_token'
const USER_KEY = 'dropbox_user'

interface DropboxConfigs {
    dropbox_client_id?: string
    dropbox_redirect_uri?: string
}

// Functional security utilities for token storage
const createSecureStorage = () => {
    // Private encryption/decryption functions
    const encrypt = (data: string): string => {
        // Simple encoding - in production, use proper encryption
        return btoa(data)
    }

    const decrypt = (data: string): string => {
        try {
            return atob(data)
        } catch {
            return data // Fallback for unencrypted data
        }
    }

    // Create timestamped data structure
    const createTimestampedData = (value: string) => ({
        value,
        timestamp: Date.now(),
    })

    // Check if data is expired (30 days)
    const isExpired = (timestamp: number): boolean => {
        const thirtyDays = 30 * 24 * 60 * 60 * 1000
        return Date.now() - timestamp > thirtyDays
    }

    // Public API using closures
    return {
        setItem: (key: string, value: string): void => {
            try {
                const dataWithTimestamp = JSON.stringify(
                    createTimestampedData(value),
                )
                const encrypted = encrypt(dataWithTimestamp)
                localStorage.setItem(key, encrypted)
            } catch (error) {
                console.error('Failed to store data securely:', error)
                // Fallback to regular storage
                localStorage.setItem(key, value)
            }
        },

        getItem: (key: string): string | null => {
            try {
                const stored = localStorage.getItem(key)
                if (!stored) return null

                const decrypted = decrypt(stored)

                // Try to parse as timestamped data
                try {
                    const parsed = JSON.parse(decrypted)
                    if (parsed.value && parsed.timestamp) {
                        if (isExpired(parsed.timestamp)) {
                            localStorage.removeItem(key)
                            return null
                        }
                        return parsed.value
                    }
                } catch {
                    // Fallback for old unstructured data
                    return decrypted
                }

                return decrypted
            } catch (error) {
                console.error('Failed to retrieve data securely:', error)
                return localStorage.getItem(key)
            }
        },

        removeItem: (key: string): void => {
            localStorage.removeItem(key)
        },

        clear: (): void => {
            // Only clear our specific keys for security
            localStorage.removeItem(TOKEN_KEY)
            localStorage.removeItem(REFRESH_TOKEN_KEY)
            localStorage.removeItem(USER_KEY)
        },
    }
}

// Create secure storage instance using closure
const secureStorage = createSecureStorage()

// PKCE helper functions
const generateRandomString = (length: number): string => {
    const charset =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return result
}

const sha256 = async (plain: string): Promise<ArrayBuffer> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(plain)
    return await window.crypto.subtle.digest('SHA-256', data)
}

const base64URLEncode = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    let result = ''
    for (let i = 0; i < bytes.byteLength; i++) {
        result += String.fromCharCode(bytes[i])
    }
    return btoa(result)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
}

export function useDropboxAuth(dropboxConfigs?: DropboxConfigs) {
    const {
        props: { onError },
    } = useRootContext()

    const [token, setToken] = useState<string | undefined>(undefined)
    const [refreshToken, setRefreshToken] = useState<string | undefined>(
        undefined,
    )
    const [user, setUser] = useState<DropboxUser | undefined>(undefined)
    const [isLoading, setIsLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [dropboxClient, setDropboxClient] = useState<any>(null)

    const dropboxClientId = dropboxConfigs?.dropbox_client_id

    useEffect(() => {
        if (!dropboxClientId) {
            setIsLoading(false)
            return
        }

        try {
            const storedToken = secureStorage.getItem(TOKEN_KEY)
            const storedRefreshToken = secureStorage.getItem(REFRESH_TOKEN_KEY)
            const storedUser = secureStorage.getItem(USER_KEY)

            const client = new Dropbox({
                clientId: dropboxClientId,
                accessToken: storedToken || undefined,
            })

            setDropboxClient(client)

            if (storedToken && storedUser) {
                try {
                    setToken(storedToken)
                    setRefreshToken(storedRefreshToken || undefined)
                    setUser(JSON.parse(storedUser))
                    setIsAuthenticated(true)
                } catch (error) {
                    console.error('Failed to parse stored user info:', error)
                    logout()
                }
            }
        } catch (error) {
            console.error('Dropbox init error:', error)
            onError('Failed to initialize Dropbox client')
        } finally {
            setIsLoading(false)
        }
    }, [dropboxClientId, onError])

    const refreshAccessToken = useCallback(
        async (currentRefreshToken: string): Promise<string | null> => {
            if (!dropboxClientId) {
                onError('Dropbox client not initialized')
                return null
            }

            try {
                const response = await fetch(
                    'https://api.dropbox.com/oauth2/token',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                            grant_type: 'refresh_token',
                            refresh_token: currentRefreshToken,
                            client_id: dropboxClientId,
                        }),
                    },
                )

                if (!response.ok) {
                    throw new Error(`Token refresh failed: ${response.status}`)
                }

                const data = await response.json()
                const newAccessToken = data.access_token

                secureStorage.setItem(TOKEN_KEY, newAccessToken)
                setToken(newAccessToken)

                return newAccessToken
            } catch (error) {
                console.error('Failed to refresh token:', error)
                onError(
                    'Failed to refresh Dropbox token. Please re-authenticate.',
                )
                logout()
                return null
            }
        },
        [dropboxClientId, onError],
    )

    const fetchUserInfo = useCallback(
        async (accessToken: string): Promise<DropboxUser> => {
            try {
                const client = new Dropbox({ accessToken })
                const response = await client.usersGetCurrentAccount()
                const data = response.result

                return {
                    name: data.name.display_name,
                    email: data.email,
                    picture: data.profile_photo_url,
                    locale: data.locale,
                    given_name: data.name.given_name,
                    family_name: data.name.surname,
                }
            } catch (error) {
                console.error('Error fetching user info:', error)
                throw new Error('Failed to get user info')
            }
        },
        [],
    )

    const handleAuthSuccess = useCallback(
        async (accessToken: string, newRefreshToken?: string) => {
            try {
                const userInfo = await fetchUserInfo(accessToken)

                secureStorage.setItem(TOKEN_KEY, accessToken)
                secureStorage.setItem(USER_KEY, JSON.stringify(userInfo))

                if (newRefreshToken) {
                    secureStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)
                    setRefreshToken(newRefreshToken)
                }

                setToken(accessToken)
                setUser(userInfo)
                setIsAuthenticated(true)

                return userInfo
            } catch (error) {
                console.error('Authentication error:', error)
                onError('Failed to complete Dropbox authentication')
                // Clear stored data on error
                secureStorage.clear()
                setToken(undefined)
                setRefreshToken(undefined)
                setUser(undefined)
                setIsAuthenticated(false)
                return null
            }
        },
        [fetchUserInfo, onError],
    )

    const exchangeCodeForTokens = useCallback(
        async (authorizationCode: string, verifier: string) => {
            if (!dropboxClientId) {
                onError('Dropbox client not initialized')
                return
            }

            try {
                const redirectUri = window.location.origin
                const response = await fetch(
                    'https://api.dropbox.com/oauth2/token',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                            code: authorizationCode,
                            grant_type: 'authorization_code',
                            client_id: dropboxClientId,
                            code_verifier: verifier,
                            redirect_uri: redirectUri,
                        }),
                    },
                )

                if (!response.ok) {
                    const errorText = await response.text()
                    console.error('Token exchange failed:', errorText)
                    throw new Error(`Token exchange failed: ${response.status}`)
                }

                const data = await response.json()
                const accessToken = data.access_token
                const newRefreshToken = data.refresh_token

                if (accessToken) {
                    await handleAuthSuccess(accessToken, newRefreshToken)
                } else {
                    throw new Error('No access token received')
                }
            } catch (error) {
                console.error('Token exchange error:', error)
                onError('Failed to exchange authorization code for tokens')
            }
        },
        [dropboxClientId, onError, handleAuthSuccess],
    )

    const authenticate = useCallback(async () => {
        if (!dropboxClient || !dropboxClientId) {
            onError('Dropbox client not initialized')
            return
        }

        try {
            // Generate PKCE parameters
            const verifier = generateRandomString(128)
            const challengeBuffer = await sha256(verifier)
            const challenge = base64URLEncode(challengeBuffer)

            const origin = window.location.origin
            const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${dropboxClientId}&response_type=code&redirect_uri=${origin}&token_access_type=offline&code_challenge=${challenge}&code_challenge_method=S256`

            const width = 800
            const height = 600
            const left = window.screenX + (window.outerWidth - width) / 2
            const top = window.screenY + (window.outerHeight - height) / 2
            const popupWindowFeatures = `width=${width},height=${height},left=${left},top=${top},toolbar=0,scrollbars=1,status=1,resizable=1`

            const authWindow = window.open(
                authUrl,
                'DropboxAuth',
                popupWindowFeatures,
            )

            if (!authWindow) {
                throw new Error('Popup blocked by browser')
            }

            const pollTimer = setInterval(() => {
                try {
                    if (authWindow.closed) {
                        clearInterval(pollTimer)
                        return
                    }

                    const currentUrl = authWindow.location.href

                    if (currentUrl.includes(origin)) {
                        if (currentUrl.includes('code=')) {
                            clearInterval(pollTimer)

                            const urlParams = new URLSearchParams(
                                new URL(authWindow.location.href).search,
                            )
                            const authorizationCode = urlParams.get('code')

                            if (authorizationCode && verifier) {
                                exchangeCodeForTokens(
                                    authorizationCode,
                                    verifier,
                                )
                            }

                            authWindow.close()
                        }
                    }
                } catch {
                    // Ignore cross-origin errors while popup is on dropbox.com
                }
            }, 500)
        } catch (error) {
            onError(
                'Failed to start Dropbox authentication: ' +
                    (error as Error).message,
            )
        }
    }, [dropboxClient, dropboxClientId, onError, exchangeCodeForTokens])

    const logout = useCallback(() => {
        secureStorage.clear()
        setToken(undefined)
        setRefreshToken(undefined)
        setUser(undefined)
        setIsAuthenticated(false)
    }, [])

    return {
        token,
        refreshToken,
        user,
        isLoading,
        isAuthenticated,
        authenticate,
        logout,
        dropboxClient,
        refreshAccessToken,
    }
}
