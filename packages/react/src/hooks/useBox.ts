import { useCallback, useEffect, useState } from 'react'
import {
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
} from '../context/RootContext'
import { useBoxAuth } from './useBoxAuth'

type BoxUser = { name: string; email: string }
type BoxItem = { id: string; name: string; type: 'file' | 'folder'; size?: number; isFolder: boolean }
type BoxFolder = BoxItem & { children?: BoxItem[] }

const BOX_API = 'https://api.box.com/2.0'

export function useBox() {
    const { core } = useUploaderRuntime()
    const { onError } = useUploaderOptions()
    const { boxConfigs } = useUploaderSource()

    const { isAuthenticated, token, isLoading, authenticate, logout, refreshAccessToken, refreshToken } = useBoxAuth(boxConfigs as any)

    const [user, setUser] = useState<BoxUser>()
    const [boxFiles, setBoxFiles] = useState<BoxFolder>()

    const fetchBox = useCallback(async (url: string, isRetry = false): Promise<Response> => {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        if (res.status === 401 && !isRetry && refreshToken) {
            const newToken = await refreshAccessToken(refreshToken)
            if (newToken) return fetchBox(url, true)
        }
        return res
    }, [token, refreshToken, refreshAccessToken])

    const getUserInfo = useCallback(async () => {
        try {
            const res = await fetchBox(`${BOX_API}/users/me`)
            if (!res.ok) return
            const data = await res.json()
            setUser({ name: data.name, email: data.login })
        } catch (e) {
            core?.emit('box-user-info-error', { error: e })
        }
    }, [fetchBox, core])

    const fetchRootContents = useCallback(async () => {
        try {
            const res = await fetchBox(`${BOX_API}/folders/0/items?fields=id,name,type,size&limit=1000`)
            if (!res.ok) throw new Error(`Box API error ${res.status}`)
            const data = await res.json()
            const items: BoxItem[] = (data.entries || []).map((e: any) => ({
                id: e.id,
                name: e.name,
                type: e.type,
                size: e.size,
                isFolder: e.type === 'folder',
            }))
            setBoxFiles({ id: '0', name: 'Box', type: 'folder', isFolder: true, children: items })
            core?.emit('box-files-loaded', { count: items.length })
        } catch (e) {
            onError(`Failed to fetch Box files: ${(e as Error).message}`)
        }
    }, [fetchBox, onError, core])

    useEffect(() => {
        if (token && isAuthenticated && !isLoading) {
            getUserInfo()
            fetchRootContents()
        }
    }, [token, isAuthenticated, isLoading, getUserInfo, fetchRootContents])

    return { user, boxFiles, token, isAuthenticated, isLoading, authenticate, logout }
}
