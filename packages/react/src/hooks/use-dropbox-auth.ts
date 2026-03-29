'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const TOKEN_KEY = 'upup_dropbox_token'
const REFRESH_KEY = 'upup_dropbox_refresh_token'
const WIN_NAME = 'DropboxAuthPopup'

export type DropboxConfigs = {
    dropbox_client_id?: string
    dropbox_redirect_uri?: string
}

function getSecure() {
    if (typeof window === 'undefined') return null
    return {
        get: (k: string) => { try { return sessionStorage.getItem(k) } catch { return null } },
        set: (k: string, v: string) => { try { sessionStorage.setItem(k, v) } catch {} },
        remove: (k: string) => { try { sessionStorage.removeItem(k) } catch {} },
    }
}

export function useDropboxAuth(configs?: DropboxConfigs) {
    const { dropbox_client_id = '', dropbox_redirect_uri = '' } = configs ?? {}

    const [token, setToken] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null
        return getSecure()?.get(TOKEN_KEY) ?? null
    })
    const [refreshToken, setRefreshToken] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null
        return getSecure()?.get(REFRESH_KEY) ?? null
    })
    const [isLoading, setIsLoading] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getSecure()?.get(TOKEN_KEY))
    const popupRef = useRef<Window | null>(null)

    const logout = useCallback(() => {
        const s = getSecure()
        s?.remove(TOKEN_KEY)
        s?.remove(REFRESH_KEY)
        setToken(null)
        setRefreshToken(null)
        setIsAuthenticated(false)
    }, [])

    const refreshAccessToken = useCallback(async (rt: string): Promise<string | null> => {
        if (!dropbox_client_id) return null
        try {
            const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: rt,
                    client_id: dropbox_client_id,
                }).toString(),
            })
            const data = await res.json()
            if (data.access_token) {
                const s = getSecure()
                s?.set(TOKEN_KEY, data.access_token)
                setToken(data.access_token)
                return data.access_token
            }
        } catch {}
        return null
    }, [dropbox_client_id])

    const authenticate = useCallback(() => {
        if (!dropbox_client_id) return
        const redirectUri = dropbox_redirect_uri || `${window.location.origin}/dropbox-callback`
        const state = Math.random().toString(36).slice(2)
        const authUrl =
            `https://www.dropbox.com/oauth2/authorize?` +
            `response_type=code&client_id=${dropbox_client_id}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&state=${state}&token_access_type=offline`

        setIsLoading(true)
        const popup = window.open(authUrl, WIN_NAME, 'width=600,height=700')
        popupRef.current = popup

        const handler = (event: MessageEvent) => {
            if (event.data?.type !== 'dropbox_auth') return
            const { access_token, refresh_token } = event.data
            if (access_token) {
                const s = getSecure()
                s?.set(TOKEN_KEY, access_token)
                if (refresh_token) s?.set(REFRESH_KEY, refresh_token)
                setToken(access_token)
                if (refresh_token) setRefreshToken(refresh_token)
                setIsAuthenticated(true)
            }
            setIsLoading(false)
            window.removeEventListener('message', handler)
        }
        window.addEventListener('message', handler)
    }, [dropbox_client_id, dropbox_redirect_uri])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            popupRef.current?.close()
        }
    }, [])

    return {
        token,
        refreshToken,
        isLoading,
        isAuthenticated,
        authenticate,
        logout,
        refreshAccessToken,
    }
}
