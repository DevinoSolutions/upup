import React, { FormEventHandler, useState } from 'react'
import { useRootContext } from '../context/RootContext'
import useFetchFileByUrl from '../hooks/useFetchFileByUrl'
import { cn } from '../lib/tailwind'
import AdapterViewContainer from './shared/AdapterViewContainer'

export default function UrlUploader() {
    const {
        setFiles,
        setActiveAdapter,
        props: {
            icons: { LoaderIcon },
            dark,
            classNames,
        },
    } = useRootContext()
    const [url, setUrl] = useState('')
    const { loading, fetchImage } = useFetchFileByUrl()

    const handleFormSubmit: FormEventHandler<HTMLFormElement> = async e => {
        e.preventDefault()
        const file = await fetchImage(url)
        if (file) {
            Object.assign(file, {
                url,
            })
            setFiles([file])
            setUrl('')
            setActiveAdapter(undefined)
        }
    }

    return (
        <AdapterViewContainer>
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
                        classNames.urlInput,
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
                        classNames.urlFetchButton,
                    )}
                    type="submit"
                    disabled={!url}
                >
                    {loading ? <LoaderIcon /> : 'Fetch'}
                </button>
            </form>
        </AdapterViewContainer>
    )
}
