import React, { FormEventHandler, useState } from 'react'
import { useRootContext } from '../context/RootContext'
import useFetchFileByUrl from '../hooks/useFetchFileByUrl'
import { cn } from '../lib/tailwind'

export default function UrlUploader() {
    const {
        setFiles,
        setActiveAdapter,
        props: { loader, dark },
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
        <form onSubmit={handleFormSubmit} className="px-3 py-2">
            <input
                type="url"
                placeholder="Enter file url"
                className={cn(
                    'w-full rounded-md border-2 border-[#e0e0e0] bg-transparent px-3 py-2 outline-none',
                    {
                        'border-[#6D6D6D] text-[#6D6D6D] dark:border-[#6D6D6D] dark:text-[#6D6D6D]':
                            dark,
                    },
                )}
                value={url}
                onChange={e => setUrl(e.currentTarget.value)}
            />
            <button
                className={cn(
                    'mt-2 w-full rounded-md bg-blue-600 p-2 text-white transition-all duration-300 disabled:bg-[#e0e0e0]',
                    {
                        'bg-[#59D1F9] disabled:bg-[#6D6D6D] dark:bg-[#59D1F9] dark:disabled:bg-[#6D6D6D]':
                            dark,
                    },
                )}
                type="submit"
                disabled={!url}
            >
                {loading ? <>{loader}</> : 'Upload'}
            </button>
        </form>
    )
}
