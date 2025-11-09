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
            <form onSubmit={handleFormSubmit} className="upup-px-3 upup-py-2">
                <input
                    type="url"
                    placeholder="Enter file url"
                    className={cn(
                        'upup-w-full upup-rounded-md upup-border-2 upup-border-[#e0e0e0] upup-bg-transparent upup-px-3 upup-py-2 upup-outline-none',
                        {
                            'upup-border-[#6D6D6D] upup-text-[#6D6D6D] dark:upup-border-[#6D6D6D] dark:upup-text-[#6D6D6D]':
                                dark,
                        },
                        classNames.urlInput,
                    )}
                    value={url}
                    onChange={e => setUrl(e.currentTarget.value)}
                />
                <button
                    className={cn(
                        'upup-disabled:bg-[#e0e0e0] upup-mt-2 upup-w-full upup-rounded-md upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300',
                        {
                            'upup-disabled:bg-[#6D6D6D] dark:upup-disabled:bg-[#6D6D6D] upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]':
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
