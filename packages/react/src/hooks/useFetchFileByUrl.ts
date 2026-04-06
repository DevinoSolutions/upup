'use client'
import { useCallback, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { useRootContext } from '../context/RootContext'

export default function useFetchFileByUrl() {
    const {
        core,
        props: { onError },
    } = useRootContext()
    const [loading, setLoading] = useState(false)

    const fetchImage = useCallback(
        async (url: string) => {
            if (loading) return

            try {
                setLoading(true)
                const response = await fetch(url)
                const blob = await response.blob()
                const extension = blob.type.split('/')[1]

                const file = new File([blob], `${uuid()}.${extension}`, {
                    type: blob.type,
                })

                // v2: emit url-fetch event via UpupCore
                core?.emit('url-fetch', { file })
                return file
            } catch (error) {
                onError((error as Error).message)
                return
            } finally {
                setLoading(false)
            }
        },
        [loading, onError],
    )

    return { loading, fetchImage }
}
