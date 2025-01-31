import React, { FormEventHandler, useState } from 'react'
import { UploadAdapter } from '../../shared/types'
import { useRootContext } from '../context/RootContext'
import useFetchFileByUrl from '../hooks/useFetchFileByUrl'

export default function UrlUploader() {
    const { setFiles, setView } = useRootContext()
    const [url, setUrl] = useState('')
    const { error, loading, fetchImage } = useFetchFileByUrl()

    const handleFormSubmit: FormEventHandler<HTMLFormElement> = async e => {
        e.preventDefault()
        const file = await fetchImage(url)
        if (file) {
            setFiles([file])
            setUrl('')
            setView(UploadAdapter.INTERNAL)
        }
    }

    return (
        <form onSubmit={handleFormSubmit}>
            {error && <p className="text-red-500">{error}!</p>}
            <input
                type="url"
                placeholder="Enter image url"
                className="w-full rounded-md border-2 border-gray-300 bg-transparent p-2 outline-none"
                value={url}
                onChange={e => setUrl(e.currentTarget.value)}
            />
            <button
                className="mt-2 w-full rounded-md bg-blue-500 p-2 text-white transition-all duration-300 hover:bg-blue-600 active:bg-blue-700"
                type="submit"
            >
                {loading ? 'Loading...' : 'Upload'}
            </button>
        </form>
    )
}
