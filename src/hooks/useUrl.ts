import { useEffect, useState } from 'react'

const useUrl = (url: string) => {
    const [image, setImage] = useState<null | Blob>(null)
    const [error, setError] = useState<null | string>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [trigger, setTrigger] = useState<boolean>(false)

    useEffect(() => {
        if (!trigger) return
        setLoading(true)
        fetch(url)
            .then(response => response.blob())
            .then(blob => setImage(blob))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, [trigger])

    return { image, error, loading, setTrigger }
}

export default useUrl
