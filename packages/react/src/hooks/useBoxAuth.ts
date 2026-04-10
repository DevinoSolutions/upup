'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRootContext } from '../context/RootContext'
import { createSecureStorage } from '../lib/storageHelper'

const TOKEN_KEY = 'box_access_token'
const REFRESH_KEY = 'box_refresh_token'
const USER_KEY = 'box_user'
const WIN_NAME = 'BoxAuthPopup'

interface BoxConfigs {
    box_client_id?: string
    box_redirect_uri?: string
}

const secure = createSecureStorage()

/* ── PKCE helpers ── */
const rand = (n = 32) =>
    Array.from(crypto.getRandomValues(new Uint8Array(n)))
        .map(b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[b % 64])
        .join('')

const sha256 = (txt: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt))

const b64url = (ab: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(ab)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

export function useBoxAuth(cfg?: BoxConfigs) {
    const {
        core,
        props: { onError },
        translations,
    } = useRootContext()

    const [token, setTok] = useState<string>()
    const [rtok, setRtok] = useState<string>()
    const [busy, setBusy] = useState(false)
    const [ready, setReady] = useState(false)

    const winRef = useRef<Window | null>(null)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const verifierRef = useRef<string>('')

    const clientId = cfg?.box_client_id
    const redirectUri = cfg?.box_redirect_uri || `${typeof window !== 'undefined' ? window.location.origin : ''}/box_redirect`

    /* ── hydrate stored session ── */
    useEffect(() => {
        const t = secure.getItem(TOKEN_KEY)
        const rt = secure.getItem(REFRESH_KEY)
        if (t) { setTok(t); setRtok(rt || undefined) }
        setReady(true)
    }, [])

    const finalize = useCallback((access: string, refresh?: string) => {
        secure.setItem(TOKEN_KEY, access)
        if (refresh) secure.setItem(REFRESH_KEY, refresh)
        setTok(access)
        setRtok(refresh)
        setBusy(false)
        core?.emit('box-auth-success', {})
    }, [core])

    const authenticate = useCallback(async () => {
        if (!clientId) {
            onError(translations.boxClientIdMissing)
            core?.emit('box-auth-config-error', { reason: 'clientId missing' })
            return
        }
        if (busy) return

        const verifier = rand(128)
        verifierRef.current = verifier
        const challenge = b64url(await sha256(verifier))

        const url =
            'https://account.box.com/api/oauth2/authorize' +
            `?response_type=code` +
            `&client_id=${encodeURIComponent(clientId)}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&code_challenge=${challenge}` +
            `&code_challenge_method=S256`

        winRef.current?.close()
        winRef.current = window.open(
            url, WIN_NAME,
            `width=800,height=600,left=${window.screenX + 60},top=${window.screenY + 60},toolbar=0,scrollbars=1`,
        )

        if (!winRef.current) {
            onError(translations.popupBlocked)
            return
        }

        setBusy(true)

        pollRef.current = setInterval(async () => {
            if (!winRef.current) return
            try {
                if (winRef.current.closed) {
                    clearInterval(pollRef.current!)
                    setBusy(false)
                    return
                }
                const href = winRef.current.location.href
                if (!href.startsWith(redirectUri) || !href.includes('code=')) return
                clearInterval(pollRef.current!)

                const code = new URL(href).searchParams.get('code')!
                const body = new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    client_id: clientId,
                    code_verifier: verifierRef.current,
                    redirect_uri: redirectUri,
                })
                const res = await fetch('https://api.box.com/oauth2/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body,
                })
                if (!res.ok) throw new Error(await res.text())
                const j = await res.json()
                finalize(j.access_token, j.refresh_token)
                winRef.current.close()
            } catch (e) {
                if ((e as Error).message?.includes('Failed to read')) return
                onError(translations.boxAuthFailed)
                setBusy(false)
                winRef.current?.close()
                clearInterval(pollRef.current!)
            }
        }, 500)
    }, [clientId, redirectUri, busy, onError, finalize, translations])

    const refreshAccessToken = useCallback(async (rt: string): Promise<string | null> => {
        if (!clientId) return null
        try {
            const res = await fetch('https://api.box.com/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: rt, client_id: clientId }),
            })
            if (!res.ok) throw new Error(await res.text())
            const j = await res.json()
            secure.setItem(TOKEN_KEY, j.access_token)
            setTok(j.access_token)
            return j.access_token
        } catch {
            onError(translations.boxSessionExpired)
            logout()
            return null
        }
    }, [clientId, onError])

    const logout = useCallback(() => {
        secure.clear([TOKEN_KEY, REFRESH_KEY, USER_KEY])
        setTok(undefined)
        setRtok(undefined)
        winRef.current?.close()
        setBusy(false)
        core?.emit('box-auth-logout', {})
    }, [core])

    return {
        token,
        refreshToken: rtok,
        isLoading: !ready || busy,
        isAuthenticated: !!token,
        authenticate,
        logout,
        refreshAccessToken,
    }
}
