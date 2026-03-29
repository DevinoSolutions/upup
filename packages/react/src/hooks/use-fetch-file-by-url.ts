'use client'

import { useCallback, useState } from 'react'
import { useUploaderContext } from '../context/uploader-context'

export default function useFetchFileByUrl() {
    const {
        // TODO: wire up onError when UploaderContext exposes it (Task 3.8)
    } = useUploaderContext()
    const [loading, setLoading] = useState(false)

    const fetchImage = useCallback(
        async (url: string) => {
            if (loading) return

            try {
                setLoading(true)
                const response = await fetch(url)
                const blob = await response.blob()
                const extension = blob.type.split('/')[1]

                const file = new File([blob], `${crypto.randomUUID()}.${extension}`, {
                    type: blob.type,
                })

                return file
            } catch (error) {
                // TODO: call onError once context exposes it (Task 3.8)
                console.error((error as Error).message)
                return
            } finally {
                setLoading(false)
            }
        },
        [loading],
    )

    return { loading, fetchImage }
}
