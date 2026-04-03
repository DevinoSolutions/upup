'use client'

import React, { FormEventHandler, useState } from 'react'
import { useUploaderContext } from '../context/uploader-context'
import useFetchFileByUrl from '../hooks/use-fetch-file-by-url'
import { cn } from '../lib/tailwind'

export default function UrlUploader() {
    const {
        setFiles,
        setActiveSource,
        resolvedTheme,
        icons,
        t,
    } = useUploaderContext()

    const { LoaderIcon } = icons

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
                placeholder={t('url.enterFileUrl')}
                className="upup-w-full upup-rounded-md upup-border-2 upup-bg-transparent upup-px-3 upup-py-2 upup-outline-none"
                style={{
                    borderColor: 'var(--upup-color-border)',
                    color: 'var(--upup-color-text)',
                }}
                value={url}
                onChange={e => setUrl(e.currentTarget.value)}
                data-upup-slot="urlUploader.input"
            />
            <button
                className="upup-mt-2 upup-w-full upup-rounded-md upup-p-2 upup-text-white upup-transition-all upup-duration-300 disabled:upup-opacity-50"
                style={{ backgroundColor: 'var(--upup-color-primary)' }}
                type="submit"
                disabled={!url}
                data-upup-slot="urlUploader.fetchButton"
            >
                {loading ? (LoaderIcon ? <LoaderIcon /> : '...') : t('url.fetch')}
            </button>
        </form>
    )
}
