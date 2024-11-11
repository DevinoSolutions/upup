import { useConfigContext } from 'context/config-context'
import { useUrl } from 'hooks'
import { memo, useEffect, useState } from 'react'
import { Adapter } from 'types'

export default memo(function UrlUploader() {
    const { setFiles, setActiveAdapter } = useConfigContext()
    const [url, setUrl] = useState('')
    const { image, setTrigger, error, loading } = useUrl(url)

    useEffect(() => {
        if (image) {
            setFiles(prevFiles => [...prevFiles, image] as File[])
            setActiveAdapter(Adapter.INTERNAL)
        }
    }, [image])

    return (
        <form
            className=""
            onSubmit={e => {
                e.preventDefault()
            }}
        >
            {error && <p className="text-red-500">{error}!</p>}
            <input
                type="url"
                placeholder="Enter image url"
                className="w-full rounded-md border-2 border-gray-300 bg-transparent p-2 outline-none"
                value={url}
                onChange={e => setUrl(e.target.value)}
            />
            <button
                className="mt-2 w-full rounded-md bg-blue-500 p-2 text-white transition-all duration-300 hover:bg-blue-600 active:bg-blue-700"
                type="button"
                onClick={() => {
                    if (loading || url === '') return
                    setTrigger(true)
                }}
            >
                {loading ? 'Loading...' : 'Upload'}
            </button>
        </form>
    )
})
