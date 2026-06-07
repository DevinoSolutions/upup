import { writable, get } from 'svelte/store'
import { onMount, onDestroy } from 'svelte'
import { useUploaderRuntime } from '../context/root-context'

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
    const { serverUrl } = useUploaderRuntime()
    const state = writable<ListState>({ status: 'idle' })
    const folderId = writable<string | undefined>(undefined)
    const search = writable('')
    let abortController: AbortController | null = null

    async function list(opts?: { folderId?: string; search?: string }) {
        if (!serverUrl) {
            state.set({
                status: 'error',
                message: 'Server Mode requires `serverUrl` prop',
            })
            return
        }
        abortController?.abort()
        const ac = new AbortController()
        abortController = ac
        state.set({ status: 'loading' })

        const params = new URLSearchParams()
        const nextFolder = opts?.folderId ?? get(folderId)
        const nextSearch = opts?.search ?? get(search)
        if (nextFolder) params.set('folderId', nextFolder)
        if (nextSearch) params.set('search', nextSearch)

        try {
            const res = await fetch(
                `${serverUrl}/files/${provider}${params.toString() ? `?${params}` : ''}`,
                { credentials: 'include', signal: ac.signal },
            )
            if (res.status === 401) {
                state.set({ status: 'reauth' })
                return
            }
            if (!res.ok) {
                const text = await res.text().catch(() => '')
                throw new Error(text || `${res.status}`)
            }
            const data = (await res.json()) as { files: ServerDriveFile[] }
            state.set({ status: 'ready', files: data.files })
        } catch (err) {
            if ((err as Error).name === 'AbortError') return
            state.set({ status: 'error', message: (err as Error).message })
        } finally {
            if (abortController === ac) {
                abortController = null
            }
        }
    }

    async function transfer(file: ServerDriveFile): Promise<
        | { status: 'ok'; result: unknown }
        | { status: 'reauth' }
        | { status: 'error'; message: string }
    > {
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
    }

    function startAuth() {
        if (!serverUrl) return
        const popup = window.open(
            `${serverUrl}/auth/${provider}`,
            'upup-oauth',
            'width=600,height=700',
        )
        if (!popup) {
            state.set({
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
    }

    // Initial list on mount (equivalent to Vue's immediate watch)
    onMount(() => {
        void list()
    })

    onDestroy(() => {
        abortController?.abort()
    })

    return {
        state,
        folderId,
        setFolderId(id: string | undefined) { folderId.set(id) },
        search,
        setSearch(s: string) { search.set(s) },
        refresh: list,
        transfer,
        startAuth,
    }
}
