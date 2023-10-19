import { useEffect, useState } from 'react'
import { useUrl } from 'hooks'

export default function UrlUploader({
    setFiles,
    setView,
}: {
    setFiles: (files: any) => void
    setView: (view: string) => void
}) {
    const [url, setUrl] = useState('')
    const { image, setTrigger, error, loading } = useUrl(url)

    useEffect(() => {
        if (image) {
            setFiles((prev: any) => [...prev, image])
            setView('internal')
        }
    }, [image])

    return (
        <form
            className=""
            onSubmit={e => {
                e.preventDefault()

                if (loading || url === '') return
                setTrigger(true)
            }}
        >
            {error && <p className="text-red-500">{error}!</p>}
            <input
                type="url"
                placeholder="Enter image url"
                className="border-2 border-gray-300 p-2 w-full rounded-md bg-transparent outline-none"
                value={url}
                onChange={e => setUrl(e.target.value)}
            />
            <button
                className="bg-blue-500 text-white p-2 w-full mt-2 rounded-md hover:bg-blue-600 active:bg-blue-700 transition-all duration-300"
                type="button"
            >
                {loading ? 'Loading...' : 'Upload'}
            </button>
        </form>
    )
}
