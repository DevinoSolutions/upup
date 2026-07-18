import React, { useState } from 'react'
import {
    useUploaderFiles,
    useUploaderI18n,
    useUploaderOptions,
    useUploaderRuntime,
    useUploaderSource,
    useUploaderTheme,
} from '../context/UploaderContext'
import useFetchFileByUrl from '../hooks/useFetchFileByUrl'
import { cn } from '@upupjs/core/internal'
import SourceViewContainer from './shared/SourceViewContainer'

export default function UrlUploader(): React.ReactElement | null {
    const { core } = useUploaderRuntime()
    const { setFiles } = useUploaderFiles()
    const { setActiveSource } = useUploaderSource()
    const { translations: tr } = useUploaderI18n()
    const {
        icons: { LoaderIcon },
    } = useUploaderOptions()
    const { isDark: dark, slotOverrides: slotClasses } = useUploaderTheme()
    const [url, setUrl] = useState('')
    const { loading, fetchImage } = useFetchFileByUrl()

    const handleFormSubmit = async (
        e: React.SyntheticEvent<HTMLFormElement>,
    ) => {
        e.preventDefault()
        core?.emit('url-submit', { url })
        const file = await fetchImage(url)
        if (file) {
            Object.assign(file, {
                url,
            })
            setFiles([file])
            setUrl('')
            setActiveSource(undefined)
        }
    }

    return (
        <SourceViewContainer
            data-testid="upup-url-uploader"
            data-upup-slot="url-uploader"
        >
            <form
                onSubmit={e => {
                    void handleFormSubmit(e)
                }}
                className="upup-flex upup-w-full upup-max-w-[380px] upup-flex-col upup-items-center upup-gap-3 upup-px-6"
            >
                <span
                    className={cn(
                        'upup-flex upup-h-12 upup-w-12 upup-items-center upup-justify-center upup-rounded-2xl',
                        dark
                            ? 'upup-bg-[#38bdf8]/15 upup-text-[#38bdf8]'
                            : 'upup-bg-[#0284c7]/10 upup-text-[#0284c7]',
                    )}
                    aria-hidden="true"
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="22"
                        height="22"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M9.5 14.5l5-5" />
                        <path d="M11 6.5l1-1a3.6 3.6 0 0 1 5 5l-2 2" />
                        <path d="M13 17.5l-1 1a3.6 3.6 0 0 1-5-5l2-2" />
                    </svg>
                </span>
                <input
                    type="url"
                    name="upup-url"
                    aria-label={tr.enterFileUrl}
                    placeholder={tr.enterFileUrl}
                    className={cn(
                        'upup-w-full upup-rounded-xl upup-px-3.5 upup-py-2.5 upup-text-sm upup-outline-none upup-ring-1 upup-transition-shadow focus:upup-ring-2 focus:upup-ring-[#38bdf8]',
                        dark
                            ? 'upup-bg-white/[0.06] upup-text-[#e2e8f0] upup-ring-white/[0.1] placeholder:upup-text-[#64748b]'
                            : 'upup-bg-white upup-text-[#0f172a] upup-ring-black/[0.08] placeholder:upup-text-[#94a3b8]',
                        slotClasses.urlInput,
                    )}
                    value={url}
                    onChange={e => {
                        setUrl(e.currentTarget.value)
                    }}
                />
                <button
                    className={cn(
                        'upup-fx-sheen-sweep upup-fx-press upup-w-full upup-rounded-xl upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white disabled:upup-cursor-not-allowed disabled:upup-opacity-50',
                        dark
                            ? 'upup-bg-[#38bdf8] dark:upup-bg-[#38bdf8]'
                            : 'upup-bg-[#0ea5e9]',
                        slotClasses.urlFetchButton,
                    )}
                    type="submit"
                    disabled={!url}
                >
                    {loading ? <LoaderIcon /> : tr.fetch}
                </button>
            </form>
        </SourceViewContainer>
    )
}
