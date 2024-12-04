import { useEffect, useState } from 'react'

/**
 * Fetches an image from a url and returns the image, error, loading state and a trigger to fetch the image
 * @param url
 */
export const useUrl = (url: string) => {
    const [image, setImage] = useState<null | Blob>(null)
    const [error, setError] = useState<null | string>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [trigger, setTrigger] = useState<boolean>(false)

    const clearImage = () => setImage(null)

    useEffect(() => {
        if (!trigger) return
        setLoading(true)
        fetch(url)
            .then(response => response.blob())
            .then(blob => setImage(blob))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, [trigger])

    return { image, error, loading, setTrigger, clearImage }
}
