// @ts-expect-error typings incomplete
import { Dropbox, DropboxUser } from 'dropbox'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRootContext } from '../context/RootContext'
import { createSecureStorage } from '../lib/storageHelper'

const TOKEN_KEY = 'dropbox_access_token'
const REFRESH_KEY = 'dropbox_refresh_token'
const USER_KEY = 'dropbox_user'

const WIN_NAME = 'DropboxAuthPopup'

interface DropboxConfigs {
    dropbox_client_id?: string
    dropbox_redirect_uri?: string
}

const secure = createSecureStorage()

const addBusyOverlay = (w: Window) => {
    if (w.document.getElementById('__dbx_busy__')) return
    const doc = w.document
    const overlay = doc.createElement('div')
    const spinner = doc.createElement('div')
    overlay.id = '__dbx_busy__'
    overlay.style.cssText =
        'position:fixed;inset:0;background:#fff;display:flex;' +
        'justify-content:center;align-items:center;z-index:9999'
    spinner.style.cssText =
        'width:48px;height:48px;border:6px solid #ddd;border-top-color:#3498db;' +
        'border-radius:50%;animation:dbxspin .8s linear infinite'
    overlay.appendChild(spinner)

    const style = doc.createElement('style')
    style.textContent = '@keyframes dbxspin{to{transform:rotate(360deg)}}'
    doc.head.appendChild(style)
    doc.body.appendChild(overlay)
}

/* ─────────── helpers ─────────── */
const rand = (n = 32) =>
    Array.from(crypto.getRandomValues(new Uint8Array(n)))
        .map(
            b =>
                'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[
                    b % 64
                ],
        )
        .join('')

const sha256 = (txt: string) =>
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt))

const b64url = (ab: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(ab)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

/* ─────────── React hook ─────────── */
export function useDropboxAuth(cfg?: DropboxConfigs) {
    const {
        props: { onError },
    } = useRootContext()

    const [token, setTok] = useState<string>()
    const [rtok, setRtok] = useState<string>()
    const [user, setUser] = useState<DropboxUser>()
    const [busy, setBusy] = useState(false)
    const [ready, setReady] = useState(false)

    const winRef = useRef<Window | null>(null)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const verifierRef = useRef<string>('') // keep the PKCE verifier for exchange

    const clientId = cfg?.dropbox_client_id
    const redirectUri =
        cfg?.dropbox_redirect_uri || `${window.location.origin}/dp_redirect`

    /* ── initial hydrate ── */
    useEffect(() => {
        const t = secure.getItem(TOKEN_KEY)
        const rt = secure.getItem(REFRESH_KEY)
        const u = secure.getItem(USER_KEY)
        if (t && u) {
            setTok(t)
            setRtok(rt || undefined)
            setUser(JSON.parse(u))
        }
        setReady(true)
    }, [])

    /* ── helper: profile fetch + save ── */
    const finalizeAuth = useCallback(
        async (access: string, refresh?: string) => {
            secure.setItem(TOKEN_KEY, access)
            if (refresh) secure.setItem(REFRESH_KEY, refresh)

            try {
                const info = (
                    await new Dropbox({
                        accessToken: access,
                    }).usersGetCurrentAccount()
                ).result
                const dbxUser: DropboxUser = {
                    name: info.name.display_name,
                    email: info.email,
                    picture: info.profile_photo_url,
                    locale: info.locale,
                    given_name: info.name.given_name,
                    family_name: info.name.surname,
                }
                secure.setItem(USER_KEY, JSON.stringify(dbxUser))
                setUser(dbxUser)
            } catch (e) {
                console.log('[DBX-AUTH] profile fetch failed', e)
            }

            setTok(access)
            setRtok(refresh || undefined)
            setBusy(false)
        },
        [],
    )

    /* ── popup launcher ── */
    const authenticate = useCallback(async () => {
        if (!clientId) {
            onError('Dropbox clientId missing')
            return
        }
        if (busy) {
            return
        }

        const verifier = rand(128)
        verifierRef.current = verifier // save for exchange
        const challenge = b64url(await sha256(verifier))

        const url =
            'https://www.dropbox.com/oauth2/authorize' +
            `?client_id=${encodeURIComponent(clientId)}` +
            `&response_type=code` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&token_access_type=offline` +
            `&scope=${encodeURIComponent(
                'files.metadata.read files.content.read files.content.write account_info.read',
            )}` +
            `&code_challenge=${challenge}` +
            `&code_challenge_method=S256`

        winRef.current?.close()
        winRef.current = window.open(
            url,
            WIN_NAME,
            `width=800,height=600,left=${window.screenX + 60},top=${
                window.screenY + 60
            },toolbar=0,scrollbars=1,status=1,resizable=1`,
        )

        if (!winRef.current) {
            onError('Popup blocked')
            return
        }

        setBusy(true)

        /* -------- poll loop -------- */
        pollRef.current = setInterval(async () => {
            if (!winRef.current) return // safety
            addBusyOverlay(winRef.current)
            try {
                /* if user manually closed it – stop */
                if (winRef.current.closed) {
                    clearInterval(pollRef.current!)
                    setBusy(false)
                    return
                }

                const href = winRef.current.location.href
                if (!href.startsWith(redirectUri) || !href.includes('code='))
                    return

                clearInterval(pollRef.current!)

                const code = new URL(href).searchParams.get('code')!
                const body = new URLSearchParams({
                    code,
                    client_id: clientId,
                    code_verifier: verifierRef.current,
                    grant_type: 'authorization_code',
                    redirect_uri: redirectUri,
                })

                const res = await fetch(
                    'https://api.dropbox.com/oauth2/token',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body,
                    },
                )
                if (!res.ok) throw new Error(await res.text())
                const j = await res.json()

                await finalizeAuth(j.access_token, j.refresh_token)
                winRef.current.close()
            } catch (e) {
                /* cross-origin while still on dropbox or exchange error */
                if ((e as Error).message?.includes('Failed to read')) return
                console.error('[DBX-AUTH] poll/error', e)
                if ((e as Error).message != 'invalid_grant')
                    onError('Dropbox authentication failed')
                setBusy(false)
                winRef.current?.close()
                clearInterval(pollRef.current!)
            }
        }, 500)
    }, [clientId, redirectUri, busy, onError, finalizeAuth])

    /* ── refresh token ── */
    const refreshAccessToken = useCallback(
        async (rt: string): Promise<string | null> => {
            if (!clientId) return null
            try {
                const r = await fetch('https://api.dropbox.com/oauth2/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        grant_type: 'refresh_token',
                        refresh_token: rt,
                        client_id: clientId,
                    }),
                })
                if (!r.ok) throw new Error(await r.text())
                const j = await r.json()
                secure.setItem(TOKEN_KEY, j.access_token)
                setTok(j.access_token)
                console.log('[DBX-AUTH] token refreshed')
                return j.access_token
            } catch (e) {
                console.error('[DBX-AUTH] refresh error', e)
                onError('Dropbox session expired – please reconnect')
                logout()
                return null
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [clientId, onError],
    )

    /* ── logout ── */
    const logout = useCallback(() => {
        secure.clear([TOKEN_KEY, REFRESH_KEY, USER_KEY])
        setTok(undefined)
        setRtok(undefined)
        setUser(undefined)
        winRef.current?.close()
        if (winRef.current) winRef.current.close()
        setBusy(false)
    }, [])

    return {
        token: token,
        refreshToken: rtok,
        user,
        isLoading: !ready || busy,
        isAuthenticated: !!token,
        authenticate,
        logout,
        dropboxClient: token ? new Dropbox({ accessToken: token }) : null,
        refreshAccessToken,
    }
}
