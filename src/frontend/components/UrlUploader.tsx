import React, { FormEventHandler, useState } from 'react'
import { useRootContext } from '../context/RootContext'
import useFetchFileByUrl from '../hooks/useFetchFileByUrl'

export default function UrlUploader() {
    const {
        setFiles,
        setActiveAdapter,
        props: { loader },
    } = useRootContext()
    const [url, setUrl] = useState('')
    const { loading, fetchImage } = useFetchFileByUrl()

    const handleFormSubmit: FormEventHandler<HTMLFormElement> = async e => {
        e.preventDefault()
        const file = await fetchImage(url)
        if (file) {
            setFiles([file])
            setUrl('')
            setActiveAdapter(undefined)
        }
    }

    return (
        <form onSubmit={handleFormSubmit}>
            <input
                type="url"
                placeholder="Enter file url"
                className="w-full rounded-md border-2 border-gray-300 bg-transparent px-3 py-2 outline-none"
                value={url}
                onChange={e => setUrl(e.currentTarget.value)}
            />
            <button
                className="mt-2 w-full rounded-md bg-blue-500 p-2 text-white transition-all duration-300 hover:bg-blue-600 active:bg-blue-700 disabled:bg-slate-300"
                type="submit"
                disabled={!url}
            >
                {loading ? <>{loader}</> : 'Upload'}
            </button>
        </form>
    )
}
