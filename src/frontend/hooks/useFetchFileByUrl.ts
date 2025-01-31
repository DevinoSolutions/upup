import { useCallback, useState } from 'react'
import { v4 as uuid } from 'uuid'

export default function useFetchFileByUrl() {
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const fetchImage = useCallback(
        async (url: string) => {
            if (loading) return

            try {
                setLoading(true)
                const response = await fetch(url)
                const blob = await response.blob()

                const file = new File([blob], `${uuid()}.${blob.type}`, {
                    type: blob.type,
                })
                return file
            } catch (error) {
                setError((error as Error).message)
                return
            } finally {
                setLoading(false)
            }
        },
        [loading],
    )

    return { error, loading, fetchImage }
}
