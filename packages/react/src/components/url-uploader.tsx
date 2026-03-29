'use client'

import React, { FormEventHandler, useState } from 'react'
import { useUploaderContext } from '../context/uploader-context'
import useFetchFileByUrl from '../hooks/use-fetch-file-by-url'
import { cn } from '../lib/tailwind'

// TODO: replace with i18n translations (Task 3.8)
const TR = {
    enterFileUrl: 'Enter file URL...',
    fetch: 'Fetch',
}

export default function UrlUploader() {
    const {
        setFiles,
        setActiveSource,
        dark,
        classNames,
        icons,
    } = useUploaderContext()

    const { LoaderIcon } = icons as any
    const tr = TR

    const [url, setUrl] = useState('')
    const { loading, fetchImage } = useFetchFileByUrl()

    const handleFormSubmit: FormEventHandler<HTMLFormElement> = async e => {
        e.preventDefault()
        const file = await fetchImage(url)
        if (file) {
            Object.assign(file, { url })
            await setFiles([file])
            setUrl('')
            setActiveSource(null)
        }
    }

    return (
        <form onSubmit={handleFormSubmit} className="upup-px-3 upup-py-2">
            <input
                type="url"
                placeholder={tr.enterFileUrl}
                className={cn(
                    'upup-w-full upup-rounded-md upup-border-2 upup-border-[#e0e0e0] upup-bg-transparent upup-px-3 upup-py-2 upup-outline-none',
                    dark && 'upup-border-[#6D6D6D] upup-text-[#6D6D6D]',
                    (classNames as any)?.urlInput,
                )}
                value={url}
                onChange={e => setUrl(e.currentTarget.value)}
            />
            <button
                className={cn(
                    'upup-disabled:bg-[#e0e0e0] upup-mt-2 upup-w-full upup-rounded-md upup-bg-blue-600 upup-p-2 upup-text-white upup-transition-all upup-duration-300',
                    dark && 'upup-bg-[#59D1F9] upup-disabled:bg-[#6D6D6D]',
                    (classNames as any)?.urlFetchButton,
                )}
                type="submit"
                disabled={!url}
            >
                {loading ? (LoaderIcon ? <LoaderIcon /> : '...') : tr.fetch}
            </button>
        </form>
    )
}
