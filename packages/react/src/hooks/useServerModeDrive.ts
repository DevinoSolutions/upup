import { useCallback, useEffect, useRef, useState } from 'react'
import { useRootContext } from '../context/RootContext'

export type ServerDriveFile = {
    id: string
    name: string
    size?: number
    mimeType?: string
    thumbnailUrl?: string
    isFolder: boolean
    modifiedAt?: string
}

export type ServerModeProvider =
    | 'google-drive'
    | 'onedrive'
    | 'dropbox'
    | 'box'

type ListState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; files: ServerDriveFile[] }
    | { status: 'reauth' }
    | { status: 'error'; message: string }

export function useServerModeDrive(provider: ServerModeProvider) {
    const { serverUrl } = useRootContext()
    const [state, setState] = useState<ListState>({ status: 'idle' })
    const [folderId, setFolderId] = useState<string | undefined>(undefined)
    const [search, setSearch] = useState<string>('')
    const abortRef = useRef<AbortController | null>(null)

    const list = useCallback(
        async (opts?: { folderId?: string; search?: string }) => {
            if (!serverUrl) {
                setState({
                    status: 'error',
                    message: 'Server Mode requires `serverUrl` prop',
                })
                return
            }
            abortRef.current?.abort()
            const ac = new AbortController()
            abortRef.current = ac
            setState({ status: 'loading' })

            const params = new URLSearchParams()
            const nextFolder = opts?.folderId ?? folderId
            const nextSearch = opts?.search ?? search
            if (nextFolder) params.set('folderId', nextFolder)
            if (nextSearch) params.set('search', nextSearch)

            try {
                const res = await fetch(
                    `${serverUrl}/files/${provider}${params.toString() ? `?${params}` : ''}`,
                    { credentials: 'include', signal: ac.signal },
                )
                if (res.status === 401) {
                    setState({ status: 'reauth' })
                    return
                }
                if (!res.ok) {
                    const text = await res.text().catch(() => '')
                    throw new Error(text || `${res.status}`)
                }
                const data = (await res.json()) as { files: ServerDriveFile[] }
                setState({ status: 'ready', files: data.files })
            } catch (err) {
                if ((err as Error).name === 'AbortError') return
                setState({ status: 'error', message: (err as Error).message })
            }
        },
        [serverUrl, provider, folderId, search],
    )

    const transfer = useCallback(
        async (file: ServerDriveFile): Promise<
            | { status: 'ok'; result: unknown }
            | { status: 'reauth' }
            | { status: 'error'; message: string }
        > => {
            if (!serverUrl) {
                return {
                    status: 'error',
                    message: 'Server Mode requires `serverUrl` prop',
                }
            }
            try {
                const res = await fetch(
                    `${serverUrl}/files/${provider}/transfer`,
                    {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fileId: file.id,
                            fileName: file.name,
                            size: file.size,
                            mimeType: file.mimeType,
                        }),
                    },
                )
                if (res.status === 401) return { status: 'reauth' }
                if (!res.ok) {
                    const text = await res.text().catch(() => '')
                    return {
                        status: 'error',
                        message: text || `${res.status}`,
                    }
                }
                const result = await res.json()
                return { status: 'ok', result }
            } catch (err) {
                return { status: 'error', message: (err as Error).message }
            }
        },
        [serverUrl, provider],
    )

    const startAuth = useCallback(() => {
        if (!serverUrl) return
        const popup = window.open(
            `${serverUrl}/auth/${provider}`,
            'upup-oauth',
            'width=600,height=700',
        )
        if (!popup) {
            setState({
                status: 'error',
                message: 'Popup blocked. Allow popups and try again.',
            })
            return
        }
        const onMessage = (ev: MessageEvent) => {
            const data = ev.data as
                | { type?: string; provider?: string }
                | undefined
            if (data?.type === 'upup:oauth-success' && data.provider === provider) {
                window.removeEventListener('message', onMessage)
                void list()
            }
        }
        window.addEventListener('message', onMessage)
    }, [serverUrl, provider, list])

    useEffect(() => {
        void list()
        return () => abortRef.current?.abort()
    }, [list])

    return {
        state,
        folderId,
        setFolderId,
        search,
        setSearch,
        refresh: list,
        transfer,
        startAuth,
    }
}
